import type { SupabaseClient } from "@supabase/supabase-js";
import { PERK_PEOPLE } from "./pricing";

/**
 * Where a giver stands on the family perk. Perks are granted on the server
 * (app/auth/callback) when someone signs up from a business's gift link,
 * and marked used by the Stripe webhook once the discounted gift is paid.
 */
export type PerkState =
  | { has: false }
  | { has: true; from: string; people: number; ready: boolean; needed: number };

export async function perkState(db: SupabaseClient, userId: string): Promise<PerkState> {
  const { data: perk } = await db.from("perks").select("from_name, used_at").eq("user_id", userId).maybeSingle();
  if (!perk || perk.used_at) return { has: false };
  const { count } = await db
    .from("recipients")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .is("org_id", null);
  const people = count ?? 0;
  return { has: true, from: perk.from_name || "us", people, ready: people >= PERK_PEOPLE, needed: Math.max(0, PERK_PEOPLE - people) };
}
