import type { SupabaseClient, User } from "@supabase/supabase-js";
import { INTERESTS, STYLES } from "./types";

/**
 * A business and its gift style. The style shapes every gift idea its team
 * sees: a fast-food chain and a luxury store shouldn't get the same list.
 * gift_min and gift_max are in dollars, what the business pays per gift.
 */
export type Org = {
  id: string;
  name: string;
  gift_kind: string | null;
  gift_min: number | null;
  gift_max: number | null;
  gift_styles: string[];
  gift_avoid: string[];      // interests to leave out, from INTERESTS
};

export const ORG_COLS = "id,name,gift_kind,gift_min,gift_max,gift_styles,gift_avoid";

export type GiftKind = { id: string; label: string; min: number; max: number; styles: string[]; avoid: string[] };

/** The kinds of company the app tells apart. Each sets a starting gift style that can be changed after. */
export const GIFT_KINDS: GiftKind[] = [
  { id: "everyday", label: "Restaurants, retail and warehouses", min: 15, max: 40, styles: ["practical", "fun", "foodie", "cozy"], avoid: ["fashion", "beauty"] },
  { id: "office", label: "Office, finance and tech", min: 30, max: 100, styles: ["techy", "practical", "foodie"], avoid: ["building toys", "board games"] },
  { id: "luxury", label: "Luxury, fashion and beauty", min: 75, max: 250, styles: ["classy", "personal care"], avoid: ["gaming", "building toys", "board games", "science"] },
  { id: "care", label: "Healthcare and care work", min: 25, max: 75, styles: ["cozy", "personal care", "foodie"], avoid: ["gaming"] },
  { id: "field", label: "Trades, field and outdoor work", min: 25, max: 100, styles: ["practical", "outdoor"], avoid: ["fashion", "beauty"] },
  { id: "school", label: "Schools and nonprofits", min: 15, max: 50, styles: ["cozy", "practical", "creative"], avoid: [] },
  { id: "custom", label: "Something else (I'll choose)", min: 25, max: 75, styles: [], avoid: [] },
];

export const kindById = (id: string | null | undefined) => GIFT_KINDS.find((k) => k.id === id);

// Well-known names first, then words that tend to appear in a company's name.
const BRANDS: Record<string, string[]> = {
  everyday: ["mcdonald", "burger king", "wendy", "taco bell", "chipotle", "subway", "starbucks", "dunkin", "kfc", "popeyes", "chick-fil-a",
    "domino", "pizza hut", "papa john", "panera", "sonic", "arby", "jack in the box", "five guys", "shake shack", "dairy queen",
    "walmart", "target", "costco", "kroger", "safeway", "publix", "aldi", "dollar general", "dollar tree", "home depot", "lowe",
    "best buy", "cvs", "walgreens", "7-eleven", "wawa", "sheetz", "amazon warehouse", "ups", "fedex", "ikea", "trader joe", "whole foods"],
  luxury: ["saks", "neiman", "bergdorf", "nordstrom", "bloomingdale", "barneys", "tiffany", "cartier", "louis vuitton", "lvmh", "chanel",
    "gucci", "prada", "hermes", "hermès", "dior", "burberry", "rolex", "ralph lauren", "sephora", "estee lauder", "estée lauder",
    "four seasons", "ritz", "mandarin oriental", "christie", "sotheby", "bulgari", "van cleef", "versace", "armani", "fendi", "balenciaga"],
  office: ["google", "microsoft", "apple", "meta", "salesforce", "oracle", "ibm", "adobe", "netflix", "stripe", "goldman", "morgan stanley",
    "jpmorgan", "chase", "deloitte", "pwc", "kpmg", "ernst", "accenture", "mckinsey", "bain", "bcg", "blackrock", "fidelity"],
  care: ["kaiser", "mayo clinic", "cleveland clinic", "hca", "cvs health", "unitedhealth", "northwell", "mount sinai", "one medical"],
  field: ["bechtel", "fluor", "turner construction", "roto-rooter", "terminix", "orkin", "waste management", "comcast tech", "brightview"],
};
const WORDS: Record<string, string[]> = {
  everyday: ["restaurant", "grill", "diner", "pizza", "pizzeria", "burger", "taco", "cafe", "café", "bakery", "deli", "kitchen", "bar ",
    "pub", "market", "grocery", "foods", "mart", "store", "stores", "shop", "retail", "warehouse", "logistics", "distribution", "fulfillment", "express"],
  luxury: ["luxury", "boutique", "couture", "jewel", "jeweler", "jewelry", "atelier", "maison", "fine", "salon", "spa", "fashion",
    "beauty", "cosmetics", "fragrance", "resort", "fifth avenue", "5th avenue", "gallery"],
  office: ["tech", "software", "labs", "digital", "data", "systems", "cloud", "ai", "capital", "partners", "ventures", "consulting",
    "advisors", "advisory", "financial", "bank", "insurance", "law", "legal", "llp", "attorneys", "accounting", "cpa", "agency", "media", "studio"],
  care: ["health", "hospital", "clinic", "medical", "dental", "dentistry", "pharmacy", "care", "nursing", "rehab", "therapy", "pediatric",
    "veterinary", "vet", "hospice", "senior living"],
  field: ["construction", "builders", "contracting", "contractors", "plumbing", "electric", "electrical", "hvac", "heating", "cooling",
    "roofing", "landscaping", "lawn", "paving", "excavation", "trucking", "towing", "auto", "mechanic", "welding", "solar", "pest", "farm"],
  school: ["school", "academy", "college", "university", "district", "nonprofit", "non-profit", "foundation", "charity", "church", "synagogue", "ministry"],
};

/**
 * Guesses what kind of company this is from its name, so a new business starts
 * with a gift list that fits it (McDonald's and Saks shouldn't see the same
 * gifts). Returns "custom" when nothing in the name gives it away.
 */
export function guessKind(companyName: string): GiftKind {
  const n = ` ${companyName.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9&\- ]+/g, " ").replace(/\s+/g, " ")} `;
  // Whole words only (plus a plural or possessive s), so "UPS" doesn't match "Groups".
  const has = (w: string) => {
    const t = w.replace(/[’']/g, "").trim();
    return n.includes(` ${t} `) || n.includes(` ${t}s `);
  };
  // A word that says what the business does outweighs a brand name it happens to share
  // ("Chase Plumbing" is a plumber, not a bank).
  const score: Record<string, number> = {};
  for (const [id, names] of Object.entries(BRANDS)) if (names.some(has)) score[id] = 1.5;
  for (const [id, words] of Object.entries(WORDS)) score[id] = (score[id] ?? 0) + 2 * words.filter(has).length;
  let best = "custom", top = 0;
  for (const [id, s] of Object.entries(score)) if (s > top) { best = id; top = s; }
  return kindById(best)!;
}

const pick = (v: unknown[], allowed: readonly string[]) => [...new Set(v.map(String))].filter((x) => allowed.includes(x));
const dollars = (v: unknown, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(5000, n) : dflt;
};

/** The orgs table's gift columns for one kind of company. */
export const styleFromKind = (k: GiftKind) => ({
  gift_kind: k.id, gift_min: k.min, gift_max: k.max, gift_styles: k.styles, gift_avoid: k.avoid,
});

/** Reads the gift style settings form into the orgs table's columns. */
export function readGiftStyle(form: FormData) {
  const kind = kindById(String(form.get("gift_kind") ?? "")) ?? kindById("custom")!;
  let min = dollars(form.get("gift_min"), kind.min);
  let max = dollars(form.get("gift_max"), kind.max);
  if (min > max) [min, max] = [max, min];
  return {
    gift_kind: kind.id,
    gift_min: min,
    gift_max: max,
    gift_styles: pick(form.getAll("gift_styles"), STYLES).slice(0, 4),
    gift_avoid: pick(form.getAll("gift_avoid"), INTERESTS),
  };
}

/** The business this signed-in user belongs to, if any (the first one for now). */
export async function myOrg(supabase: SupabaseClient, user: User): Promise<Org | null> {
  const { data } = await supabase.from("org_members").select(`orgs(${ORG_COLS})`).eq("user_id", user.id).limit(1).maybeSingle();
  return (data?.orgs as unknown as Org) ?? null;
}

/** One business by id, with its gift style. RLS lets only its members read it. */
export async function orgById(supabase: SupabaseClient, id: string): Promise<Org | null> {
  const { data } = await supabase.from("orgs").select(ORG_COLS).eq("id", id).maybeSingle<Org>();
  return data ?? null;
}
