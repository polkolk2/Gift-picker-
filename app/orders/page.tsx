import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { money } from "@/lib/pricing";
import { giftUrl } from "@/lib/giftlink";
import CopyLink from "./CopyLink";

const LABEL: Record<string, string> = {
  pending: "Waiting for payment", paid: "Paid", ordered: "Being prepared", shipped: "On its way",
  delivered: "Delivered", refunded: "Refunded", failed: "Needs attention",
};
const CLAIM: Record<string, string> = {
  unclaimed: "Waiting for them to open it", claimed: "They added their address", swapped: "They swapped it", expired: "Link expired",
};

export default async function Orders({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("orders")
    .select("id, product, original_sku, gift_cents, fee_cents, status, delivery, claim_token, claim_status, created_at, recipient_name, recipient_phone, perk_applied")
    .eq("owner_id", user.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false });
  return (
    <main className="stack">
      <h1>Orders</h1>
      {paid && !(data ?? []).some((o) => o.id === paid) && (
        <p className="card">Thanks, your payment went through. Your gift shows here in a moment, so refresh if you don&rsquo;t see it.</p>
      )}
      {!data?.length && !paid && <p className="muted">No gifts sent yet.</p>}
      <div className="grid">
        {(data ?? []).map((o) => {
          const who = o.recipient_name;
          const linkOpen = (o.delivery === "link" || o.delivery === "text") && o.claim_status === "unclaimed" && o.claim_token;
          return (
            <div key={o.id} className="card">
              <strong>{o.product.name}</strong>
              <span className="muted">For {who ?? "someone"}</span>
              <span>{money(o.gift_cents + o.fee_cents)} plus tax{o.perk_applied ? ", family discount applied" : ""}</span>
              <span className="when">{o.claim_status === "unclaimed" || o.claim_status === "expired" ? CLAIM[o.claim_status] : LABEL[o.status] ?? o.status}</span>
              {o.claim_status === "swapped" && <span className="muted">They picked this instead of the original gift.</span>}
              {linkOpen && <CopyLink url={giftUrl(o.claim_token!)} phone={o.delivery === "text" ? o.recipient_phone : null} name={who} />}
            </div>
          );
        })}
      </div>
    </main>
  );
}
