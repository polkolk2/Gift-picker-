import type { SupabaseClient, User } from "@supabase/supabase-js";
import { OCCASIONS, STYLES, type LifeEvent, type Recipient } from "./types";
import { whoFromRecipient, type Who } from "./ai";
import type { Criteria } from "./catalog";
import { ageOn, upcoming } from "./dates";
import { orgById } from "./org";

const pickList = (v: unknown, allowed: readonly string[], max: number) =>
  (Array.isArray(v) ? v.map(String) : []).filter((x) => allowed.includes(x)).slice(0, max);
const num = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * Reads a finder request. With recipientId (signed in), the saved person fills
 * in the details; without it, the quick finder's own answers do.
 * Body: { recipientId?, occasion, styles[], budget: {min,max} in dollars,
 *         name?, age?, sex?, likes[]?, exclude[], answers? }
 */
export async function readFinder(body: Record<string, unknown>, supabase: SupabaseClient, user: User | null) {
  const occasion = OCCASIONS.includes(String(body.occasion) as (typeof OCCASIONS)[number]) ? String(body.occasion) : "birthday";
  const styles = pickList(body.styles, STYLES, 3);
  const b = (body.budget ?? {}) as { min?: unknown; max?: unknown };
  const exclude = (Array.isArray(body.exclude) ? body.exclude.map(String) : []).slice(0, 60);

  let who: Who;
  let avoid: string[] = [];
  let byDate: string | undefined; // the saved date of this occasion, so gifts arrive in time
  if (body.recipientId) {
    if (!user) return null;
    const { data: r } = await supabase.from("recipients").select("*").eq("id", String(body.recipientId)).single<Recipient>();
    if (!r) return null;
    const { data: events } = await supabase.from("events").select("*").eq("recipient_id", r.id);
    const next = upcoming([r], (events ?? []) as LifeEvent[], 400).filter((u) => u.occasion === occasion).sort((a, b) => a.daysAway - b.daysAway)[0];
    byDate = next?.date.toISOString().slice(0, 10);
    // An employee gets their company's gift style: its budget, its kind of gifts, and what it leaves out.
    const org = r.org_id ? await orgById(supabase, r.org_id) : null;
    if (org) {
      for (const s of org.gift_styles ?? []) if (!styles.includes(s) && styles.length < 4) styles.push(s);
      avoid = org.gift_avoid ?? [];
    }
    const base = org?.gift_min && org?.gift_max ? { min: org.gift_min, max: org.gift_max } : { min: r.budget_min, max: r.budget_max };
    const budget = body.budget ? { min: num(b.min, 0, 5000, base.min), max: num(b.max, 1, 5000, base.max) } : org?.gift_max ? base : undefined;
    who = whoFromRecipient(r, styles, budget);
    if (avoid.length) who = { ...who, dislikes: [...new Set([...who.dislikes, ...avoid])] };
  } else {
    const sex = body.sex === "f" || body.sex === "m" ? body.sex : "any";
    who = {
      name: String(body.name ?? "").trim().slice(0, 40) || "them",
      age: body.age === undefined || body.age === "" ? null : num(body.age, 0, 110, 30),
      sex, budgetMin: num(b.min, 0, 5000, 25), budgetMax: num(b.max, 1, 5000, 75),
      likes: (Array.isArray(body.likes) ? body.likes.map(String) : []).slice(0, 10), dislikes: [], styles,
    };
  }
  const criteria: Criteria = {
    name: who.name === "them" ? undefined : who.name, occasion, styles, likes: who.likes, dislikes: who.dislikes,
    sex: who.sex, age: who.age, minCents: who.budgetMin * 100, maxCents: who.budgetMax * 100, exclude, avoid, byDate,
  };
  return { who, criteria, occasion, exclude };
}

export { ageOn };

/** Round 3 questions when Claude isn't used (signed out, or the AI call failed). */
export const FALLBACK = [
  { q: "What does a good weekend look like for them?", options: ["Outside and active", "Cozy at home", "With friends", "Making something"] },
  { q: "Practical or a treat?", options: ["Used every day", "A little luxury", "Something fun", "Surprise me"] },
  { q: "What do they have too much of?", options: ["Gadgets", "Clothes", "Toys or games", "Books"] },
];
const ADD_STYLE: Record<string, string[]> = {
  "Outside and active": ["outdoor"], "Cozy at home": ["cozy"], "With friends": ["fun"], "Making something": ["creative"],
  "Used every day": ["practical"], "A little luxury": ["classy", "personal care"], "Something fun": ["fun"],
};
const TOO_MUCH: Record<string, string[]> = {
  Gadgets: ["tech"], Clothes: ["fashion"], "Toys or games": ["gaming", "board games", "building toys"], Books: ["reading"],
};

/** Turns answers to the standard questions into ranking hints. */
export function applyFallbackAnswers(c: Criteria, answers: { a: string }[]): Criteria {
  const styles = new Set(c.styles ?? []), dislikes = new Set(c.dislikes ?? []);
  for (const { a } of answers) {
    (ADD_STYLE[a] ?? []).forEach((x) => styles.add(x));
    (TOO_MUCH[a] ?? []).forEach((x) => dislikes.add(x));
  }
  return { ...c, styles: [...styles], dislikes: [...dislikes] };
}
