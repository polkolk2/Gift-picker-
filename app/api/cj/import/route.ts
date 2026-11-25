import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURATED } from "@/lib/catalog-data";
import { cheapestShipping, cjEnabled, cjProduct, cjSearch } from "@/lib/cj";

/**
 * Fills the catalog with real CJdropshipping items, one for each curated gift.
 *
 * For each gift it searches CJ (items in CJ's US warehouse first, then any),
 * takes the best match and its cheapest variant, and adds CJ's cheapest
 * shipping to the US. price_cents = item + shipping, so shoppers see that plus
 * your markup as one price with free shipping. Gifts with no match are hidden.
 *
 * Call: /api/cj/import?token=IMPORT_TOKEN&from=0&count=15
 * (or Vercel cron with CRON_SECRET). CJ allows about one call a second, so it
 * runs in batches.
 */
export const maxDuration = 300;

const NOISE = /\b(20\d\d|new|hot|sale|wholesale|amazon|cross[- ]border|ebay|aliexpress|best seller|free shipping|dropshipping|creative|fashion|style)\b/gi;

/** A shorter, plain version of CJ's product title. */
function cleanName(s: string) {
  const t = s.replace(NOISE, " ").replace(/[|/]+/g, " ").replace(/\s+/g, " ").trim();
  const cut = t.length > 70 ? t.slice(0, 70).replace(/\s+\S*$/, "") : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

/** Search words for a curated gift: its name without counts and "with ..." tails. */
function keywords(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/,| with | in | for /i)[0]
    .replace(/\b\d+\+?\b|\bpieces?\b|\bshots?\b|\bboxes\b|\bset of\b/gi, " ")
    .replace(/[^a-z0-9' -]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["and", "the", "of", "your", "own", "their", "for", "with", "kit", "set", "a", "an", "to", "you", "it", "in", "on"]);
const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, "y").replace(/(s)$/, ""));

/** How much of the search the CJ title covers, 0 to 1. */
function overlap(search: string, title: string) {
  const want = [...new Set(words(search))];
  if (!want.length) return 0;
  const have = new Set(words(title));
  return want.filter((w) => have.has(w)).length / want.length;
}

/**
 * The best CJ hit for a gift: its title has to cover most of the search words
 * and its price has to be near what the gift should cost.
 */
const seen: Record<string, string[]> = {};
async function bestHit(q: string, estimateCents: number) {
  const tries: [string, string | undefined][] = [];
  const short = q.split(" ").slice(-2).join(" ");
  for (const query of [...new Set([q, short])]) for (const c of ["US", undefined]) tries.push([query, c]);
  for (const [query, country] of tries) {
    const hits = await cjSearch(query, country, 20);
    if (!seen[q]) seen[q] = [];
    seen[q].push(`${query}@${country ?? "any"}: ` + hits.slice(0, 4).map((h) => `${h.nameEn} $${h.sellPrice} (${overlap(query, h.nameEn ?? "").toFixed(2)})`).join(" | "));
    const ok = hits
      .map((h) => ({ h, score: overlap(query, h.nameEn ?? ""), price: (parseFloat(String(h.sellPrice ?? "0")) || 0) * 100 }))
      .filter((x) => x.h.id && x.score >= 0.6 && (!x.price || (x.price >= estimateCents * 0.1 && x.price <= estimateCents * 2)))
      .sort((a, b) => b.score - a.score);
    if (ok.length) return { hit: ok[0].h, warehouse: country ?? "CN" };
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const cron = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}` && !!process.env.CRON_SECRET;
  if (!cron && (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  if (!cjEnabled()) return NextResponse.json({ error: "CJ_API_KEY is not set" }, { status: 400 });

  const from = Math.max(0, Number(url.searchParams.get("from") ?? 0) || 0);
  const count = Math.min(25, Math.max(1, Number(url.searchParams.get("count") ?? 15) || 15));
  const rows = CURATED.slice(from, from + count);
  const db = supabaseAdmin();
  const results: unknown[] = [];

  for (const [sku, giftName, estimate, tags, styles, occasions, sex, ages, emoji] of rows) {
    const q = keywords(giftName);
    try {
      const found = await bestHit(q, estimate);
      if (!found) {
        await db.from("products").update({ active: false }).eq("sku", sku);
        results.push({ sku, search: q, matched: false });
        continue;
      }
      const { hit, warehouse } = found;
      const detail = await cjProduct(hit.id, warehouse === "US" ? "US" : undefined);
      const variant = [...(detail.variants ?? [])]
        .filter((v) => v.vid && Number(v.variantSellPrice) > 0)
        .sort((a, b) => Number(a.variantSellPrice) - Number(b.variantSellPrice))[0];
      if (!variant) {
        await db.from("products").update({ active: false }).eq("sku", sku);
        results.push({ sku, search: q, matched: false, reason: "no variant with a price" });
        continue;
      }
      const ship = await cheapestShipping(variant.vid, warehouse, "US");
      const itemCents = Math.round(Number(variant.variantSellPrice) * 100);
      const shipCents = Math.round(ship.usd * 100);
      if (itemCents + shipCents > estimate * 2.5) {
        await db.from("products").update({ active: false }).eq("sku", sku);
        results.push({ sku, search: q, matched: false, reason: `too pricey: ${(itemCents + shipCents) / 100}` });
        continue;
      }
      const name = cleanName(detail.productNameEn || hit.nameEn || giftName);

      await db.from("products").upsert({
        sku,
        name,
        description: null,
        price_cents: itemCents + shipCents, // item + shipping; markup is added at checkout
        tags, styles, occasions, sex,
        age_min: ages[0], age_max: ages[1],
        emoji,
        image_url: variant.variantImage || detail.bigImage || hit.bigImage || null,
        ships_by: "supplier",
        supplier_ref: `cj:${variant.vid}${warehouse === "US" ? "" : `@${warehouse}`}`,
        active: true,
      });
      results.push({ sku, search: q, matched: true, name, warehouse, item: itemCents / 100, shipping: ship.usd, days: ship.days });
    } catch (e) {
      results.push({ sku, search: q, matched: false, error: String((e as Error).message ?? e).slice(0, 200) });
    }
  }

  if (url.searchParams.get("debug")) return NextResponse.json({ results, seen });
  return NextResponse.json({ from, count: rows.length, next: from + rows.length < CURATED.length ? from + rows.length : null, results });
}
