import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

// Facebook, Google, Apple and email links send the giver back here after sign-in.
// ?gift=<token> means they came from a business's gift link, so they get the
// family perk: one per person, one per gift, never on a gift they sent.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const gift = url.searchParams.get("gift");
  let welcome = false;
  if (code) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (user && gift) {
      const db = supabaseAdmin();
      const { data: o } = await db
        .from("orders")
        .select("id, owner_id, org_id, claim_status")
        .eq("claim_token", gift.slice(0, 64))
        .maybeSingle();
      if (o && o.org_id && o.owner_id !== user.id && (o.claim_status === "claimed" || o.claim_status === "swapped")) {
        const { data: org } = await db.from("orgs").select("name").eq("id", o.org_id).maybeSingle();
        const { error } = await db.from("perks").insert({ user_id: user.id, from_name: org?.name ?? null, from_order: o.id });
        welcome = !error; // fails quietly if they or this gift already have a perk
      }
    }
  }
  return NextResponse.redirect(new URL(welcome ? "/people?welcome=1" : "/people", url.origin));
}
