"use server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { productSource } from "@/lib/catalog";
import { fulfill, type ShipTo } from "@/lib/fulfillment";

const field = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);

export async function claimGift(form: FormData) {
  const token = field(form, "token", 64);
  const db = supabaseAdmin();
  const { data: o } = await db
    .from("orders")
    .select("id, product, gift_cents, claim_expires_at")
    .eq("claim_token", token)
    .eq("claim_status", "unclaimed")
    .maybeSingle();
  if (!o || new Date(o.claim_expires_at) < new Date()) redirect(`/g/${token}`);

  // A swap must be a live product worth no more than what was paid.
  const wanted = field(form, "sku", 80) || o.product.sku;
  const swapped = wanted !== o.product.sku;
  const product = swapped ? await productSource.get(wanted) : null;
  if (swapped && (!product || product.priceCents > o.gift_cents)) redirect(`/g/${token}`);

  const shipTo: ShipTo = {
    name: field(form, "name"),
    line1: field(form, "line1"),
    line2: field(form, "line2") || null,
    city: field(form, "city", 60),
    state: field(form, "state", 2).toUpperCase(),
    postal_code: field(form, "postal_code", 10),
    country: "US",
  };
  if (!shipTo.name || !shipTo.line1 || !shipTo.city || !/^[A-Z]{2}$/.test(shipTo.state) || !/^\d{5}(-\d{4})?$/.test(shipTo.postal_code)) {
    redirect(`/g/${token}`);
  }

  const newProduct = product
    ? { ...o.product, sku: product.sku, name: product.name, ships_by: product.source }
    : o.product;
  // Only the first claim wins, even if the form is sent twice.
  const { data: claimed } = await db
    .from("orders")
    .update({
      product: newProduct,
      original_sku: swapped ? o.product.sku : null,
      ship_to: shipTo,
      claim_status: swapped ? "swapped" : "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", o.id)
    .eq("claim_status", "unclaimed")
    .select("id")
    .maybeSingle();
  if (claimed) {
    const result = await fulfill({ id: o.id, sku: newProduct.sku, shipTo, message: newProduct.message });
    await db.from("orders").update(result.ok ? { status: "ordered", fulfillment_ref: result.ref } : { status: "failed", fulfillment_ref: result.reason }).eq("id", o.id);
  }
  redirect(`/g/${token}`);
}
