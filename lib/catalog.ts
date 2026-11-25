import type { Pick, Product, Recipient } from "./types";
import { ageOn } from "./dates";
import { supabaseAdmin } from "./supabase/server";
import { CURATED, CURATED_PRODUCTS } from "./catalog-data";
import { shopperPrice } from "./pricing";
import type { PublicPick } from "./types";

/**
 * Where products come from: the products table (seed.sql loads a starter set,
 * /admin adds more). CATALOG=sample uses the built-in list below instead.
 */
export interface ProductSource {
  list(): Promise<Product[]>;
  get(sku: string): Promise<Product | null>;
}

const SAMPLE: Product[] = CURATED_PRODUCTS;

export const SAMPLE_ROWS = CURATED; // the same list supabase/seed.sql loads

export const sampleSource: ProductSource = {
  async list() { return SAMPLE; },
  async get(sku) { return SAMPLE.find((p) => p.sku === sku) ?? null; },
};

type ProductRow = {
  sku: string; name: string; description: string | null; price_cents: number; tags: string[]; styles: string[];
  occasions: string[]; sex: "f" | "m" | "any"; age_min: number; age_max: number; image_url: string | null; emoji: string | null; ships_by: "self" | "supplier";
};
const COLS = "sku,name,description,price_cents,tags,styles,occasions,sex,age_min,age_max,image_url,emoji,ships_by";
const fromRow = (r: ProductRow): Product => ({
  sku: r.sku, name: r.name, description: r.description, priceCents: r.price_cents, tags: r.tags, styles: r.styles,
  occasions: r.occasions, sex: r.sex, ages: [r.age_min, r.age_max], image: r.image_url ?? undefined, emoji: r.emoji, source: r.ships_by,
});

export const dbSource: ProductSource = {
  async list() {
    const { data } = await supabaseAdmin().from("products").select(COLS).eq("active", true).limit(2000);
    return ((data ?? []) as ProductRow[]).map(fromRow);
  },
  async get(sku) {
    const { data } = await supabaseAdmin().from("products").select(COLS).eq("sku", sku).eq("active", true).maybeSingle();
    return data ? fromRow(data as ProductRow) : null;
  },
};

export const productSource: ProductSource = process.env.CATALOG === "sample" ? sampleSource : dbSource;

/** Every active product worth no more than a gift's value, for the recipient's swap list. */
export async function swapOptions(maxCents: number, except: string, avoid: string[] = []) {
  const all = await productSource.list();
  const fits = all.filter((p) => p.priceCents <= maxCents && p.sku !== except);
  const skip = new Set(avoid);
  const kept = fits.filter((p) => !p.tags.some((t) => skip.has(t)));
  return (kept.length >= 3 ? kept : fits).sort((a, b) => b.priceCents - a.priceCents);
}

/** What the finder knows about the gift. Everything is optional except the price range. */
export type Criteria = {
  name?: string;            // for the "why" line
  occasion?: string;
  styles?: string[];        // classy, outdoor...
  likes?: string[];
  dislikes?: string[];
  sex?: "f" | "m" | "any";
  age?: number | null;
  minCents: number;
  maxCents: number;
  exclude?: string[];
  boost?: string[];         // interests from round 3 answers
  avoid?: string[];         // interests a business leaves out for its team
};

/** Scores the catalog and returns the best three not shown yet, spread across kinds of gift. */
export function rank(products: Product[], c: Criteria): Pick[] {
  const likes = new Set(c.likes ?? []), dis = new Set(c.dislikes ?? []), plus = new Set(c.boost ?? []);
  const styles = new Set(c.styles ?? []);
  const exclude = new Set(c.exclude ?? []);
  const avoid = new Set(c.avoid ?? []);
  if (avoid.size) {
    const kept = products.filter((p) => !p.tags.some((t) => avoid.has(t)));
    if (kept.length >= 3) products = kept;
  }
  const who = c.name ?? "them";
  // Budgets are what the giver pays, so compare the shopper's price.
  const pay = (p: Product) => shopperPrice(p.priceCents);
  const inBudget = (p: Product) => pay(p) >= c.minCents * 0.85 && pay(p) <= c.maxCents * 1.1;
  let pool = products.filter((p) => !exclude.has(p.sku) && inBudget(p));
  if (pool.length < 3) pool = products.filter((p) => !exclude.has(p.sku) && pay(p) <= c.maxCents * 1.25);
  if (pool.length < 3) pool = products.filter((p) => !exclude.has(p.sku));

  const scored = pool.map((p) => {
    let s = 0;
    for (const t of p.tags) { if (likes.has(t)) s += 3; if (dis.has(t)) s -= 6; if (plus.has(t)) s += 2; }
    for (const st of p.styles) if (styles.has(st)) s += 4;
    if (styles.size && !p.styles.some((st) => styles.has(st))) s -= 3;
    if (c.occasion && p.occasions.length) s += p.occasions.includes(c.occasion) ? 3 : -6;
    if (p.sex !== "any" && c.sex && c.sex !== "any" && p.sex !== c.sex) s -= 4;
    if (c.age != null && (c.age < p.ages[0] || c.age > p.ages[1])) s -= 5;
    return { p, s };
  }).sort((a, b) => b.s - a.s || a.p.priceCents - b.p.priceCents);

  const why = (p: Product) => {
    const st = p.styles.filter((x) => styles.has(x));
    const hit = p.tags.filter((t) => likes.has(t));
    if (hit.length) return `Matches ${who === "them" ? "their" : `${who}'s`} interest in ${hit.join(" and ")}.`;
    if (st.length) return `A ${st.join(", ")} pick${c.occasion ? ` for a ${c.occasion}` : ""}.`;
    if (c.occasion && p.occasions.includes(c.occasion)) return `Made for a ${c.occasion}.`;
    return `In budget and a good fit for ${who}.`;
  };
  const out: Pick[] = [];
  const usedTag = new Set<string>();
  for (const { p } of scored) {
    if (out.length === 3) break;
    if (usedTag.has(p.tags[0]) && scored.length > 6) continue;
    usedTag.add(p.tags[0]);
    out.push({ ...p, why: why(p) });
  }
  for (const { p } of scored) {
    if (out.length === 3) break;
    if (!out.some((o) => o.sku === p.sku)) out.push({ ...p, why: why(p) });
  }
  return out;
}

/** The saved-person version: their profile fills in the criteria. */
export function rankForRecipient(products: Product[], r: Recipient, exclude: string[], boost: string[] = [], occasion = "birthday", styles: string[] = [], budget?: { min: number; max: number }) {
  return rank(products, {
    name: r.name, occasion, styles, likes: r.likes, dislikes: r.dislikes, sex: r.sex,
    age: ageOn(r.birthdate, new Date()),
    minCents: (budget?.min ?? r.budget_min) * 100, maxCents: (budget?.max ?? r.budget_max) * 100,
    exclude, boost,
  });
}

/** Strips your source price before picks go to the browser. */
export function toPublic(p: Pick): PublicPick {
  const out: Record<string, unknown> = { ...p, payCents: shopperPrice(p.priceCents) };
  delete out.priceCents;
  delete out.source;
  return out as PublicPick;
}
