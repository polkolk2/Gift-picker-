import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GIFT_QUERIES, type GiftQuery } from "@/lib/cj-queries";
import { cheapestShipping, cjEnabled, cjProduct, cjSearch, type CjHit } from "@/lib/cj";

/**
 * Builds the catalog from real CJdropshipping items (lib/cj-queries.ts).
 *
 * For each kind of gift it searches CJ (US warehouse first, then any), keeps
 * items whose title has every search word, takes the cheapest variant, and adds
 * CJ's cheapest shipping to the US. price_cents = item + shipping, so shoppers
 * see that plus your markup as one price with free shipping.
 *
 * Call: /api/cj/import?token=IMPORT_TOKEN&from=0&count=10
 *   &reset=1 hides every product that didn't come from CJ (the old starter list).
 *   &bg=1 answers at once and does the work in the background (results go to the logs).
 * CJ allows about one call a second, so it runs in batches.
 */
export const maxDuration = 300;

const NOISE = /\b(20\d\d|new|hot|sale|wholesale|amazon|cross[- ]border|ebay|aliexpress|best seller|free shipping|dropshipping|shipped from fba warehouse|fba|prohibited by|not shipped on weekends|shipping|walmart|banned from|temu|shein|tiktok|factory|direct|supply)\b/gi;
/** Words that mean the item isn't a gift (parts, ads, car bits). */
const NOT_GIFTS = ["diesel", "motorcycle", "advertising", "spare part", "replacement", "wholesale lot"];
/** Longest delivery we accept, in days. */
const MAX_DAYS = 25;
const maxDays = (d: unknown) => Math.max(0, ...String(d ?? "").split(/[^0-9]+/).filter(Boolean).map(Number));

/** A shorter, plain version of CJ's product title. */
function cleanName(s: string) {
  const t = s.replace(NOISE, " ").replace(/[|/,]+/g, " ").replace(/\s+/g, " ").trim();
  const dd = t.replace(/\b(\w+)( \1\b)+/gi, "$1").replace(/^[-\s]+|[-\s]+$/g, "");
  const cut = dd.length > 60 ? dd.slice(0, 60).replace(/\s+\S*$/, "").replace(/\s+(and|with|for|of|the|by|from|-)$/i, "") : dd;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

const STOP = new Set(["and", "the", "of", "for", "with", "set", "a", "an", "to", "in", "on"]);
const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/ies$/, "y").replace(/(?<!s)s$/, ""));

/** True when the title has every word of the search. */
const fits = (q: string, title: string) => {
  const have = new Set(words(title));
  return words(q).every((w) => have.has(w));
};
/** True when the title has a word this kind of gift should skip. */
const avoid = (g: GiftQuery, title: string) => {
  const t = title.toLowerCase();
  return [...NOT_GIFTS, ...(g.not ?? [])].some((w) => t.includes(w));
};
const listPrice = (h: CjHit) => parseFloat(String(h.sellPrice ?? "0")) || 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const cron = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!cron && (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  if (!cjEnabled()) return NextResponse.json({ error: "CJ_API_KEY is not set" }, { status: 400 });

  const db = supabaseAdmin();
  if (url.searchParams.get("reset") === "1") {
    const { error } = await db.from("products").update({ active: false }).not("sku", "like", "cj-%");
    if (error) return NextResponse.json({ error: `reset: ${error.message}` }, { status: 500 });
  }

  const from = Math.max(0, Number(url.searchParams.get("from") ?? 0) || 0);
  const count = Math.min(20, Math.max(1, Number(url.searchParams.get("count") ?? 10) || 10));
  const batch = GIFT_QUERIES.slice(from, from + count);
  const work = () => runBatch(db, batch);
  if (url.searchParams.get("bg") === "1") {
    after(async () => { console.log("cj-import", from, JSON.stringify(await work())); });
    return NextResponse.json({ from, count: batch.length, started: true });
  }
  const results = await work();

  const next = from + batch.length < GIFT_QUERIES.length ? from + batch.length : null;
  return NextResponse.json({ from, count: batch.length, next, total: GIFT_QUERIES.length, results });
}

type Db = ReturnType<typeof supabaseAdmin>;
async function runBatch(db: Db, batch: GiftQuery[]) {
  const results: unknown[] = [];
  for (const g of batch) {
    const want = g.take ?? 1;
    const kept: string[] = [];
    try {
      for (const country of ["US", undefined] as const) {
        if (kept.length >= want) break;
        const hits = (await cjSearch(g.q, country, 50))
          .filter((h) => h.id && fits(g.q, h.nameEn ?? "") && !avoid(g, h.nameEn ?? "") && listPrice(h) > 0 && listPrice(h) <= g.usd[1]);
        let tried = 0;
        for (const hit of hits) {
          if (kept.length >= want || tried >= 4) break;
          tried++;
          const sku = `cj-${hit.id}`.toLowerCase().slice(0, 60);
          const detail = await cjProduct(hit.id, country);
          const variant = [...(detail.variants ?? [])]
            .filter((v) => v.vid && Number(v.variantSellPrice) > 0)
            .sort((a, b) => Number(a.variantSellPrice) - Number(b.variantSellPrice))[0];
          if (!variant) continue;
          const warehouse = country ?? "CN";
          let ship;
          try { ship = await cheapestShipping(variant.vid, warehouse, "US"); } catch { continue; }
          const totalCents = Math.round(Number(variant.variantSellPrice) * 100) + Math.round(ship.usd * 100);
          if (totalCents < g.usd[0] * 100 || totalCents > g.usd[1] * 100) continue;
          if (maxDays(ship.days) > MAX_DAYS) continue;

          const name = cleanName(detail.productNameEn || hit.nameEn || g.q);
          const { error: saveError } = await db.from("products").upsert({
            sku,
            name,
            description: null,
            price_cents: totalCents, // item + shipping; your markup is added on top
            tags: g.tags,
            styles: g.styles,
            occasions: g.occasions ?? [],
            sex: g.sex ?? "any",
            age_min: g.ages[0],
            age_max: g.ages[1],
            emoji: g.emoji,
            image_url: variant.variantImage || detail.bigImage || hit.bigImage || null,
            ships_by: "supplier",
            supplier_ref: `cj:${variant.vid}${warehouse === "US" ? "" : `@${warehouse}`}`,
            active: true,
          });
          if (saveError) { results.push({ q: g.q, sku, saveError: saveError.message }); continue; }
          kept.push(sku);
          results.push({ q: g.q, sku, name, warehouse, cost: totalCents / 100, days: ship.days });
        }
      }
      if (!kept.length) results.push({ q: g.q, matched: false });
    } catch (e) {
      results.push({ q: g.q, matched: false, error: String((e as Error).message ?? e).slice(0, 200) });
    }
  }
  return results;
}
