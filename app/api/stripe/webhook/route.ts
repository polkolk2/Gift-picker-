import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fulfill, type ShipTo } from "@/lib/fulfillment";
import { issueGiftLink } from "@/lib/giftlink";

// Stripe calls this after payment. Marks the gift paid, then ships it or sends the gift link.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ ok: true });

  const s = event.data.object as Stripe.Checkout.Session;
  if (s.payment_status !== "paid") return NextResponse.json({ ok: true });
  const db = supabaseAdmin();
  const paymentIntent = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;

  const orderId = s.metadata?.order_id;
  if (!orderId) return NextResponse.json({ ok: true });
  const ship = s.collected_information?.shipping_details;
  const shipTo: ShipTo | null = ship?.address
    ? {
        name: ship.name ?? "",
        line1: ship.address.line1 ?? "",
        line2: ship.address.line2,
        city: ship.address.city ?? "",
        state: ship.address.state ?? "",
        postal_code: ship.address.postal_code ?? "",
        country: ship.address.country ?? "US",
      }
    : null;
  const { data: order } = await db
    .from("orders")
    .update({ status: "paid", ship_to: shipTo, stripe_payment_intent: paymentIntent })
    .eq("id", orderId)
    .eq("status", "pending") // ignore repeat deliveries of the same event
    .select("id, owner_id, product, delivery, perk_applied")
    .single();
  if (!order) return NextResponse.json({ ok: true });

  if (order.perk_applied) {
    await db.from("perks").update({ used_at: new Date().toISOString(), used_order: order.id }).eq("user_id", order.owner_id).is("used_at", null);
  }

  if (order.delivery === "link" || order.delivery === "text") {
    await issueGiftLink(db, order.id); // ships once the recipient claims it
  } else {
    const result = await fulfill({ id: order.id, sku: order.product.sku, shipTo, message: order.product.message });
    await db.from("orders").update(result.ok ? { status: "ordered", fulfillment_ref: result.ref } : { status: "failed", fulfillment_ref: result.reason }).eq("id", order.id);
  }
  return NextResponse.json({ ok: true });
}
