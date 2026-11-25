export type Recipient = {
  id: string;
  owner_id: string;
  name: string;
  relationship: string | null;
  birthdate: string | null;
  sex: "f" | "m" | "any";
  city: string | null;
  email?: string | null;
  org_id?: string | null;     // set for a business's employees
  department?: string | null;
  work_start?: string | null;
  likes: string[];
  dislikes: string[];
  budget_min: number;
  budget_max: number;
  notes: string | null;
};

export type LifeEvent = {
  id: string;
  recipient_id: string;
  kind: string;
  title: string;
  event_date: string;
  recurs_yearly: boolean;
};

export type Product = {
  sku: string;
  name: string;
  priceCents: number;
  tags: string[];       // interests it fits
  styles: string[];     // from STYLES
  occasions: string[];  // from OCCASIONS; empty = any occasion
  sex: "f" | "m" | "any";
  ages: [number, number];
  image?: string;
  emoji?: string | null;
  description?: string | null;
  /** Who ships it: self (you), supplier (they drop-ship), or sample data. */
  source: "sample" | "self" | "supplier";
  /** 0 to 100: how widely it sells (from the supplier), used when a profile says little. */
  popularity?: number;
};

export type Pick = Product & { why: string };

/** What the browser gets: the shopper's price, never your source price. */
export type PublicPick = Omit<Pick, "priceCents" | "source" | "popularity"> & { payCents: number };

export const INTERESTS = [
  "cooking", "coffee", "tea", "outdoors", "hiking", "fitness", "sports", "tech", "gaming",
  "reading", "music", "movies", "photography", "travel", "art", "crafts", "gardening",
  "home", "pets", "fashion", "beauty", "wellness", "board games", "science", "building toys",
] as const;

/** The occasion picker. Products list the ones they suit (or none = any). */
export const OCCASIONS = [
  "birthday", "holiday", "graduation", "wedding", "new baby", "anniversary", "work anniversary", "thank you", "get well", "housewarming",
] as const;

/** The short "what kind of gift" choices. */
export const STYLES = [
  "classy", "outdoor", "personal care", "cozy", "fun", "practical", "techy", "creative", "foodie",
] as const;

/** Price choices in the finder, in dollars. */
export const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under $25", min: 0, max: 25 },
  { label: "$25 to $50", min: 25, max: 50 },
  { label: "$50 to $100", min: 50, max: 100 },
  { label: "$100 to $200", min: 100, max: 200 },
  { label: "$200+", min: 200, max: 1000 },
];
