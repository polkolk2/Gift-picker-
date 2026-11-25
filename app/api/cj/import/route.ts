import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CURATED } from "@/lib/catalog-data";
import { cheapestShipping, cjEnabled, cjProduct, cjSearch, type CjHit } from "@/lib/cj";

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

  for (const [sku, giftName, , tags, styles, occasions, sex, ages, emoji] of rows) {
    const q = keywords(giftName);
    try {
      let warehouse = "US";
      let hits: CjHit[] = await cjSearch(q, "US");
      if (!hits.length) { warehouse = "CN"; hits = await cjSearch(q); }
      const hit = hits.find((h) => h.id);
      if (!hit) {
        await db.from("products").update({ active: false }).eq("sku", sku);
        results.push({ sku, search: q, matched: false });
        continue;
      }
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

  return NextResponse.json({ from, count: rows.length, next: from + rows.length < CURATED.length ? from + rows.length : null, results });
}
