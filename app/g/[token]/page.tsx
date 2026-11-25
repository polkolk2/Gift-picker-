import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { swapOptions } from "@/lib/catalog";
import { money, PERK_PEOPLE, PERK_PERCENT, shopperPrice } from "@/lib/pricing";
import ClaimForm from "./ClaimForm";

// The page a recipient opens from a gift link. No sign-in: the long random
// token in the address is the key. They see the gift, can swap it for anything
// worth the same or less, and type where to send it. A gift from a business
// also offers a free family account with a discount.
export const dynamic = "force-dynamic";

export default async function Gift({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data: o } = await db
    .from("orders")
    .select("product, gift_cents, sender_name, org_id, claim_status, claim_expires_at, status")
    .eq("claim_token", token)
    .maybeSingle();

  if (!o) return <main className="stack narrow"><h1>Gift not found</h1><p className="muted">Check the link, or ask the person who sent it.</p></main>;
  let from = o.sender_name || "Someone";
  if (o.org_id) {
    const { data: org } = await db.from("orgs").select("name").eq("id", o.org_id).maybeSingle();
    if (org?.name) from = org.name;
  }
  const expired = o.claim_status === "expired" || (o.claim_status === "unclaimed" && new Date(o.claim_expires_at) < new Date());

  if (expired) return <main className="stack narrow"><h1>This gift link has expired</h1><p className="muted">Let {from} know, and they can send it again.</p></main>;
  if (o.claim_status !== "unclaimed")
    return (
      <main className="stack narrow">
        <div className="hero-card">
          <span className="kicker">From {from}</span>
          <h1>Your gift is on its way</h1>
          <p>{o.product.name}</p>
          <p className="muted">{o.status === "shipped" ? "It has shipped." : "We're getting it ready."}</p>
        </div>
        {o.org_id && (
          <section className="perk stack">
            <h2>Gifts for your own people, {PERK_PERCENT}% off</h2>
            <p>Make a free account, save {PERK_PEOPLE} family members or friends, and your next gift is {PERK_PERCENT}% off. We&rsquo;ll remind you before their birthdays.</p>
            <Link className="btn" href={`/login?gift=${encodeURIComponent(token)}`}>Create my free account</Link>
          </section>
        )}
      </main>
    );

  const swaps = (await swapOptions(o.gift_cents, o.product.sku))
    .slice(0, 24)
    .map((p) => ({ sku: p.sku, name: p.name, emoji: p.emoji ?? null, description: p.description ?? null }));
  return (
    <main className="stack narrow">
      <div className="hero-card">
        <span className="kicker">A gift from {from}</span>
        <h1>{o.product.name}</h1>
        {o.product.message && <p className="note-quote">&ldquo;{o.product.message}&rdquo;</p>}
      </div>
      <p className="muted">Keep it, or swap it for anything else worth up to {money(shopperPrice(o.gift_cents))}. Then tell us where to send it. {from} won&rsquo;t see your address.</p>
      <ClaimForm token={token} current={{ sku: o.product.sku, name: o.product.name, emoji: null, description: null }} swaps={swaps} />
    </main>
  );
}
