import GiftFlow from "@/components/GiftFlow";
import { requireUser } from "@/lib/supabase/server";
import { perkState } from "@/lib/perk";
import { PERK_PERCENT } from "@/lib/pricing";

// The quick finder: no saved person needed. Anyone can browse ideas;
// sending a gift (and Claude's round 3 questions) needs a sign-in.
export default async function Find() {
  const { supabase, user } = await requireUser();
  const perk = user ? await perkState(supabase, user.id) : null;
  return (
    <main className="stack">
      <h1>Find a gift</h1>
      <p className="muted">Pick the occasion, a price and the kind of gift. You&rsquo;ll see three ideas, then three more, then a few quick questions if none fit.</p>
      <GiftFlow signedIn={!!user} perkPercent={perk?.has && perk.ready ? PERK_PERCENT : 0} />
    </main>
  );
}
