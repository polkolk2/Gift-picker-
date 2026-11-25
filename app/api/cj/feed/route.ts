import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FEED_CATEGORIES, type FeedCategory } from "@/lib/cj-categories";
import { cheapestShipping, cjEnabled, cjList, cjProduct, type CjListItem } from "@/lib/cj";

/**
 * Pulls whole CJdropshipping categories into the catalog (lib/cj-categories.ts).
 *
 * For each item it takes the cheapest variant and CJ's cheapest shipping to the
 * US (skipping anything slower than MAX_DAYS): price_cents = item + shipping,
 * and shoppers pay that plus your markup, rounded up to the dollar, shown as
 * "Free shipping". Items already saved are skipped, so it can be run again.
 * A run stops starting new items near Vercel's time limit and reports
 * stoppedAt: run again with from=stoppedAt.
 * The gift finder then picks from them by age, sex, likes, dislikes and budget.
 *
 * Call: /api/cj/feed?token=IMPORT_TOKEN&from=0&count=20&per=12&bg=1
 *   from/count: which categories (by position in FEED_CATEGORIES)
 *   per: items to keep from each CJ category id (default 12, max 50)
 *   reset=1: hides every product that isn't from CJ (the old starter list)
 *   bg=1: answers at once and does the work in the background (results go to the logs)
 */
export const maxDuration = 300;

const NOISE = /\b(20\d\d|new|hot|sale|wholesale|amazon|cross[- ]border|ebay|aliexpress|best seller|free shipping|dropshipping|shipped from fba warehouse|fba|prohibited by|not shipped on weekends|walmart|banned from|temu|shein|tiktok|factory direct|in stock|us warehouse|fast delivery)\b/gi;
const NOT_GIFTS = ["diesel", "motorcycle", "advertising", "spare part", "replacement", "wholesale lot", "sex", "adult", "lingerie", "erotic", "knife sharpener", "gun", "vape", "cigarette"];
const MAX_DAYS = 20;

function cleanName(s: string) {
  const t = s.replace(NOISE, " ").replace(/[|/,【】\[\]]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b(\w+)( \1\b)+/gi, "$1").replace(/^[-\s]+|[-\s]+$/g, "");
  const cut = t.length > 60 ? t.slice(0, 60).replace(/\s+\S*$/, "").replace(/\s+(and|with|for|of|the|by|from|in|-)$/i, "") : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}
/** CJ's price for the cheapest variant; sellPrice can be a range like "3.20 -- 7.90". */
const lowPrice = (h: CjListItem) => Math.min(...String(h.sellPrice ?? "0").split(/[^0-9.]+/).filter(Boolean).map(Number).filter((n) => n > 0), Infinity);
const maxDays = (d: unknown) => Math.max(0, ...String(d ?? "").split(/[^0-9]+/).filter(Boolean).map(Number));

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
  const count = Math.min(80, Math.max(1, Number(url.searchParams.get("count") ?? 20) || 20));
  const per = Math.min(50, Math.max(1, Number(url.searchParams.get("per") ?? 12) || 12));
  const batch = FEED_CATEGORIES.slice(from, from + count);
  const next = from + batch.length < FEED_CATEGORIES.length ? from + batch.length : null;

  if (url.searchParams.get("debug") === "1") {
    const id = batch[0]?.ids[0];
    const out: Record<string, unknown> = { id };
    for (const [k, o] of [["any", {}], ["us", { countryCode: "US" }], ["free", { freeShip: true }], ["usFree", { countryCode: "US", freeShip: true }]] as const) {
      const r = await cjList({ categoryId: id, ...o, size: 3 });
      out[k] = { total: r.total, sample: r.items.slice(0, 2).map((h) => ({ name: h.nameEn, price: h.sellPrice, free: h.addMarkStatus, days: h.deliveryCycle, cat: h.categoryId })) };
    }
    return NextResponse.json(out);
  }
  const work = () => pull(db, batch, per, from);
  if (url.searchParams.get("bg") === "1") {
    after(async () => { console.log("cj-feed", from, JSON.stringify(await work())); });
    return NextResponse.json({ from, count: batch.length, next, started: true });
  }
  return NextResponse.json({ from, count: batch.length, next, total: FEED_CATEGORIES.length, results: await work() });
}

type Db = ReturnType<typeof supabaseAdmin>;
const BUDGET_MS = 250_000; // stop starting new items before Vercel's 300s limit

async function pull(db: Db, batch: FeedCategory[], per: number, startAt = 0) {
  const t0 = Date.now();
  const { data: have } = await db.from("products").select("sku").like("sku", "cj-%");
  const known = new Set((have ?? []).map((r) => r.sku as string));
  const results: { name: string; saved: number; seen: number; error?: string }[] = [];
  let stoppedAt: number | null = null;

  for (const [k, c] of batch.entries()) {
    if (Date.now() - t0 > BUDGET_MS) { stoppedAt = startAt + k; break; }
    let saved = 0, seen = 0;
    try {
      for (const id of c.ids) {
        const cap = c.maxUsd ?? 80;
        let kept = 0;
        // US warehouse first (fast delivery), then CJ's other warehouses.
        for (const country of ["US", undefined] as const) {
          if (kept >= per || Date.now() - t0 > BUDGET_MS) break;
          const { items } = await cjList({ categoryId: id, countryCode: country, maxUsd: cap });
          seen += items.length;
          const warehouse = country ?? "CN";
          for (const h of items) {
            if (kept >= per || Date.now() - t0 > BUDGET_MS) break;
            const title = h.nameEn ?? "";
            const listUsd = lowPrice(h);
            if (!h.id || !title || !isFinite(listUsd) || listUsd < 2 || listUsd > cap) continue;
            if (NOT_GIFTS.some((w) => title.toLowerCase().includes(w))) continue;
            const sku = `cj-${h.id}`.toLowerCase().slice(0, 60);
            if (known.has(sku)) { kept++; continue; }

            // The cheapest variant and CJ's cheapest shipping to the US for it.
            const detail = await cjProduct(h.id, country);
            const v = [...(detail.variants ?? [])].filter((x) => x.vid && Number(x.variantSellPrice) > 0)
              .sort((a, b) => Number(a.variantSellPrice) - Number(b.variantSellPrice))[0];
            if (!v) continue;
            let shipUsd = 0;
            if (h.addMarkStatus !== 1) {
              let ship;
              try { ship = await cheapestShipping(v.vid, warehouse, "US"); } catch { continue; }
              if (maxDays(ship.days) > MAX_DAYS) continue;
              shipUsd = ship.usd;
            }
            const cents = Math.round(Number(v.variantSellPrice) * 100) + Math.round(shipUsd * 100);
            if (cents > (cap + 15) * 100) continue;

            const { error } = await db.from("products").upsert({
              sku,
              name: cleanName(detail.productNameEn || title),
              description: null,
              price_cents: cents, // item + shipping; your markup goes on top
              tags: c.tags,
              styles: c.styles,
              occasions: c.occasions ?? [],
              sex: c.sex ?? "any",
              age_min: c.ages[0],
              age_max: c.ages[1],
              emoji: c.emoji,
              image_url: v.variantImage || detail.bigImage || h.bigImage || null,
              ships_by: "supplier",
              supplier_ref: `cj:${v.vid}${warehouse === "US" ? "" : "@CN"}`,
              active: true,
            }, { onConflict: "sku" });
            if (error) throw new Error(`save: ${error.message}`);
            known.add(sku);
            kept++; saved++;
          }
        }
      }
      results.push({ name: c.name, saved, seen });
    } catch (e) {
      results.push({ name: c.name, saved, seen, error: String((e as Error).message ?? e).slice(0, 200) });
    }
  }
  return { stoppedAt, seconds: Math.round((Date.now() - t0) / 1000), results };
}
