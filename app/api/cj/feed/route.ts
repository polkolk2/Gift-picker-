import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FEED_CATEGORIES, type FeedCategory } from "@/lib/cj-categories";
import { cjEnabled, cjList, type CjListItem } from "@/lib/cj";

/**
 * Pulls whole CJdropshipping categories into the catalog (lib/cj-categories.ts).
 *
 * Only items CJ ships free are kept, so an item's price is just CJ's price:
 * price_cents = CJ price, and shoppers pay that plus your markup, rounded up to
 * the dollar, with "Free shipping". One CJ call brings back 100 items.
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
  const work = () => pull(db, batch, per);
  if (url.searchParams.get("bg") === "1") {
    after(async () => { console.log("cj-feed", from, JSON.stringify(await work())); });
    return NextResponse.json({ from, count: batch.length, next, started: true });
  }
  return NextResponse.json({ from, count: batch.length, next, total: FEED_CATEGORIES.length, results: await work() });
}

type Db = ReturnType<typeof supabaseAdmin>;

async function pull(db: Db, batch: FeedCategory[], per: number) {
  const results: { name: string; saved: number; seen: number; error?: string }[] = [];
  for (const c of batch) {
    let saved = 0, seen = 0;
    try {
      for (const id of c.ids) {
        const cap = c.maxUsd ?? 80;
        const rows: Record<string, unknown>[] = [];
        // US warehouse first (fast delivery), then CJ's other warehouses.
        for (const country of ["US", undefined] as const) {
          if (rows.length >= per) break;
          const { items } = await cjList({ categoryId: id, countryCode: country, freeShip: true, maxUsd: cap });
          seen += items.length;
          for (const h of items) {
            if (rows.length >= per) break;
            const usd = lowPrice(h);
            const title = h.nameEn ?? "";
            if (!h.id || !title || !isFinite(usd) || usd < 3 || usd > cap) continue;
            if (NOT_GIFTS.some((w) => title.toLowerCase().includes(w))) continue;
            if (maxDays(h.deliveryCycle) > MAX_DAYS) continue;
            const sku = `cj-${h.id}`.toLowerCase().slice(0, 60);
            if (rows.some((r) => r.sku === sku)) continue;
            rows.push({
              sku,
              name: cleanName(title),
              description: null,
              price_cents: Math.round(usd * 100), // CJ ships it free; your markup goes on top
              tags: c.tags,
              styles: c.styles,
              occasions: c.occasions ?? [],
              sex: c.sex ?? "any",
              age_min: c.ages[0],
              age_max: c.ages[1],
              emoji: c.emoji,
              image_url: h.bigImage ?? null,
              ships_by: "supplier",
              supplier_ref: `cj:pid:${h.id}${country === "US" ? "" : "@CN"}`,
              active: true,
            });
          }
        }
        if (rows.length) {
          const { error } = await db.from("products").upsert(rows, { onConflict: "sku" });
          if (error) throw new Error(`save: ${error.message}`);
          saved += rows.length;
        }
      }
      results.push({ name: c.name, saved, seen });
    } catch (e) {
      results.push({ name: c.name, saved, seen, error: String((e as Error).message ?? e).slice(0, 200) });
    }
  }
  return results;
}
