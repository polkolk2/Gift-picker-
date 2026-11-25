import { NextResponse } from "next/server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { productSource } from "@/lib/catalog";
import { PERK_PERCENT, perkPrice, shopperPrice } from "@/lib/pricing";
import { perkState } from "@/lib/perk";
import { stripe } from "@/lib/stripe";
import { site } from "@/lib/email";

// POST { recipientId? | recipientName, sku, message?, delivery: "text" | "link" | "ship",
//        recipientEmail?, recipientPhone? } -> { url } of a Stripe Checkout page.
// recipientName alone is the quick finder (no saved person).
// "text": the recipient gets a gift link, which the giver texts from their phone.
// "link": the gift link is emailed to the recipient.
// Both let the recipient add their own address and swap. "ship": the giver
// types the address at checkout.
// The price always comes from the catalog on the server, never from the browser:
// source price plus your markup, as one line, with no fees.
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  let r: { id: string | null; name: string; email: string | null; org_id: string | null };
  if (body.recipientId) {
    const { data } = await supabase.from("recipients").select("id,name,email,org_id").eq("id", String(body.recipientId)).single();
    if (!data) return NextResponse.json({ error: "Person not found" }, { status: 404 });
    r = data;
  } else {
    const name = String(body.recipientName ?? "").trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: "Add their name first" }, { status: 400 });
    r = { id: null, name, email: null, org_id: null };
  }
  const product = await productSource.get(String(body.sku));
  if (!product) return NextResponse.json({ error: "That gift isn't available" }, { status: 404 });

  const delivery = body.delivery === "link" || body.delivery === "text" ? body.delivery : "ship";
  const email = String(body.recipientEmail ?? r.email ?? "").trim();
  const recipientEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  const digits = String(body.recipientPhone ?? "").replace(/\D/g, "");
  const recipientPhone = digits.length === 10 ? digits : digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : null;
  if (delivery === "text" && !recipientPhone) return NextResponse.json({ error: "Add their 10-digit phone number" }, { status: 400 });

  // The family perk only applies to the giver's own gifts, not a business's.
  const db = supabaseAdmin();
  const perk = r.org_id ? { has: false as const } : await perkState(db, user.id);
  const perkApplied = perk.has && perk.ready;
  const total = perkApplied ? perkPrice(product.priceCents) : shopperPrice(product.priceCents);

  const { data: order, error } = await db
    .from("orders")
    .insert({
      owner_id: user.id,
      org_id: r.org_id,
      recipient_id: r.id,
      recipient_name: r.name,
      product: { sku: product.sku, name: product.name, ships_by: product.source, message: String(body.message ?? "").slice(0, 300) },
      gift_cents: product.priceCents, // source price; also the most a swap can be worth
      fee_cents: total - product.priceCents, // your markup on this gift (less with the perk)
      perk_applied: perkApplied,
      delivery,
      sender_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split("@")[0] || null,
      recipient_email: delivery === "link" ? recipientEmail : null,
      recipient_phone: delivery === "text" ? recipientPhone : null,
    })
    .select("id")
    .single();
  if (error || !order) return NextResponse.json({ error: "Couldn't start the order" }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: order.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: total,
          product_data: {
            name: product.name,
            description: perkApplied ? `Your ${PERK_PERCENT}% family discount is applied. Shipping included.` : "Shipping included.",
            metadata: { sku: product.sku },
          },
        },
      },
    ],
    // With a gift link the recipient gives the address later, so don't ask for it here.
    ...(delivery === "ship" ? { shipping_address_collection: { allowed_countries: ["US"] as const } } : {}),
    // Tax needs a ship-to address, so gift links fall back to the buyer's billing address.
    automatic_tax: { enabled: process.env.STRIPE_TAX === "on" },
    metadata: { order_id: order.id },
    success_url: `${site()}/orders?paid=${order.id}`,
    cancel_url: r.id ? `${site()}/people/${r.id}` : `${site()}/find`,
  });
  await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  return NextResponse.json({ url: session.url });
}
