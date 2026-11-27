import type { Pick, Product, Recipient } from "./types";
import { ageOn } from "./dates";
import { supabaseAdmin } from "./supabase/server";
import { CURATED, CURATED_PRODUCTS } from "./catalog-data";
import { shopperPrice } from "./pricing";
import { trendScore } from "./trending";
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
  occasions: string[]; sex: "f" | "m" | "any"; age_min: number; age_max: number; image_url: string | null; emoji: string | null; ships_by: "self" | "supplier"; popularity: number | null; ship_days: number | null;
};
const COLS = "sku,name,description,price_cents,tags,styles,occasions,sex,age_min,age_max,image_url,emoji,ships_by,popularity,ship_days";
const fromRow = (r: ProductRow): Product => ({
  sku: r.sku, name: r.name, description: r.description, priceCents: r.price_cents, tags: r.tags, styles: r.styles,
  occasions: r.occasions, sex: r.sex, ages: [r.age_min, r.age_max], image: r.image_url ?? undefined, emoji: r.emoji, source: r.ships_by, popularity: r.popularity ?? 0, shipDays: r.ship_days,
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
  byDate?: string;          // yyyy-mm-dd the gift has to arrive by
};

/** Days from today until a yyyy-mm-dd date (0 = today). */
export function daysUntil(iso: string, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000);
}

/** Only the gifts that can arrive by the date. Gifts with no delivery estimate count as a week. */
export function deliverableBy(products: Product[], byDate?: string) {
  if (!byDate) return products;
  const days = daysUntil(byDate);
  return products.filter((p) => (p.shipDays ?? 7) <= days);
}

/** Scores the catalog and returns the best three not shown yet, spread across kinds of gift. */
// Words that make a product feel like a real present, and ones that make it a chore.
const GIFTY = ["projector", "speaker", "earbuds", "headphones", "smartwatch", "smart watch", "drone", "camera", "building", "lego", "plush", "galaxy", "sunset", "lamp", "light", "karaoke", "microphone", "controller", "console", "keyboard", "necklace", "bracelet", "earrings", "ring", "jewelry", "watch", "wallet", "blanket", "mug", "tumbler", "kit", "set", "puzzle", "game", "rc ", "remote control", "massager", "diffuser", "candle", "bow tie", "palette", "grill", "golf", "telescope", "microscope"];
const CHORE = ["trimmer", "clipper", "shaver", "straightener", "curling", "gloves", "flashlight", "cushion", "pad", "tackle", "bag", "cover", "holder", "stand", "charger", "power bank", "humidifier", "towel", "sleeping bag", "brush", "eraser", "mirror", "pole", "taillight", "bike light"];
function giftiness(name: string) {
  const n = ` ${name.toLowerCase()} `;
  return (GIFTY.some((w) => n.includes(w)) ? 2 : 0) - (CHORE.some((w) => n.includes(w)) ? 2 : 0);
}

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

  // Leave out what plainly doesn't suit them (a kids' toy for an adult, a
  // women's necklace for a man), as long as enough is left to choose from.
  const ageOk = (p: Product) => c.age == null || (c.age >= p.ages[0] && c.age <= p.ages[1]);
  const sexOk = (p: Product) => p.sex === "any" || !c.sex || c.sex === "any" || p.sex === c.sex;
  const suits = pool.filter((p) => ageOk(p) && sexOk(p));
  if (suits.length >= 3) pool = suits;
  // "Anyone": keep to gifts that suit anyone, not a women's handbag or a beard trimmer.
  const openSex = !c.sex || c.sex === "any";
  if (openSex) { const uni = pool.filter((p) => p.sex === "any"); if (uni.length >= 6) pool = uni; }
  // No age given: assume a grown-up, so leave out toys made only for kids.
  if (c.age == null) { const grown = pool.filter((p) => p.ages[1] >= 25 && p.ages[0] <= 25); if (grown.length >= 6) pool = grown; }

  const scored = pool.map((p) => {
    let s = 0;
    for (const t of p.tags) { if (likes.has(t)) s += 3; if (dis.has(t)) s -= 6; if (plus.has(t)) s += 2; }
    for (const st of p.styles) if (styles.has(st)) s += 4;
    if (styles.size && !p.styles.some((st) => styles.has(st))) s -= 3;
    if (c.occasion && p.occasions.length) s += p.occasions.includes(c.occasion) ? 3 : -6;
    if (p.sex !== "any" && c.sex && c.sex !== "any" && p.sex !== c.sex) s -= 4;
    if (c.age != null && (c.age < p.ages[0] || c.age > p.ages[1])) s -= 5;
    // What people this age and sex commonly get, and how widely it sells.
    s += 3 * trendScore(p.name, c.age, c.sex);
    s += Math.min(2, (p.popularity ?? 0) / 50);
    // Would it feel like a gift? Fun, wow or keepsake items beat chores.
    s += giftiness(p.name);
    return { p, s };
  }).sort((a, b) => b.s - a.s || (b.p.popularity ?? 0) - (a.p.popularity ?? 0) || b.p.priceCents - a.p.priceCents);

  const why = (p: Product) => {
    const st = p.styles.filter((x) => styles.has(x));
    const hit = p.tags.filter((t) => likes.has(t));
    if (hit.length) return `Matches ${who === "them" ? "their" : `${who}'s`} interest in ${hit.join(" and ")}.`;
    if (st.length) return `A ${st.join(", ")} pick${c.occasion ? ` for a ${c.occasion}` : ""}.`;
    if (c.occasion && p.occasions.includes(c.occasion)) return `Made for a ${c.occasion}.`;
    return `In budget and a good fit for ${who}.`;
  };
  // Three different kinds of gift, not three speakers.
  const kind = (p: Product) => `${p.emoji ?? ""}|${p.tags[0] ?? ""}`;
  const out: Pick[] = [];
  const usedKind = new Set<string>(), usedEmoji = new Set<string>();
  for (const { p } of scored) {
    if (out.length === 3) break;
    if (scored.length > 6 && (usedKind.has(kind(p)) || (p.emoji && usedEmoji.has(p.emoji)))) continue;
    usedKind.add(kind(p)); if (p.emoji) usedEmoji.add(p.emoji);
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
  delete out.popularity; // only used to choose picks
  return out as PublicPick;
}
