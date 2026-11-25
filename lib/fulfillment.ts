import { supabaseAdmin } from "@/lib/supabase/server";
import { cjEnabled, cjOrder } from "@/lib/cj";

/**
 * Who buys and ships the gift once it's paid for (and, for a gift link, claimed).
 *
 * - A product shipped by "supplier" whose supplier id is a CJdropshipping
 *   variant id (vid, optionally written as cj:VID) is ordered from CJ
 *   automatically, and its ref is cj:<CJ order id>.
 * - Everything else, and any CJ order that fails, is "manual": it shows up under
 *   "To ship" in /admin with the address, you buy or pack it and ship it, then
 *   press "Mark shipped".
 */
export type ShipTo = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type FulfillResult = { ok: true; ref: string } | { ok: false; reason: string };

/**
 * The CJ variant id (and the warehouse country it ships from) for a product, if
 * CJ ships it. supplier_ref is a vid, cj:VID, or cj:VID@CN for another warehouse.
 */
function cjVid(p: { ships_by: string; supplier_ref: string | null } | null) {
  if (!p || p.ships_by !== "supplier" || !p.supplier_ref) return null;
  let ref = p.supplier_ref.trim();
  if (ref.toLowerCase().startsWith("cj:")) ref = ref.slice(3).trim();
  else if (ref.includes(":")) return null; // another supplier, like printful:123
  const [vid, from] = ref.split("@");
  return vid ? { vid, from: from || undefined } : null;
}

export async function fulfill(order: { id: string; sku: string; shipTo: ShipTo | null; message?: string }): Promise<FulfillResult> {
  if (!order.shipTo) return { ok: false, reason: "No shipping address" };

  if (cjEnabled()) {
    const { data: product } = await supabaseAdmin()
      .from("products").select("ships_by, supplier_ref").eq("sku", order.sku).maybeSingle();
    const cj = cjVid(product);
    if (cj) {
      try {
        const cjId = await cjOrder({ id: order.id, vid: cj.vid, from: cj.from, shipTo: order.shipTo, message: order.message });
        return { ok: true, ref: `cj:${cjId}` };
      } catch (e) {
        // Don't lose the order: it falls back to "To ship" in /admin.
        console.error(`CJ order failed for ${order.id}:`, e);
      }
    }
  }
  return { ok: true, ref: `manual:${order.id}` };
}
