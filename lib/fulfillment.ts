import { supabaseAdmin } from "@/lib/supabase/server";
import { cjEnabled, cjOrder, cjProduct } from "@/lib/cj";

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
 * cj:pid:PID (or cj:pid:PID@CN) is a CJ product: its cheapest variant is ordered.
 */
function cjVid(p: { ships_by: string; supplier_ref: string | null } | null) {
  if (!p || p.ships_by !== "supplier" || !p.supplier_ref) return null;
  let ref = p.supplier_ref.trim();
  if (ref.toLowerCase().startsWith("cj:")) ref = ref.slice(3).trim();
  else if (ref.includes(":")) return null; // another supplier, like printful:123
  const [id, from] = ref.split("@");
  if (id.toLowerCase().startsWith("pid:")) return { pid: id.slice(4), from: from || undefined };
  return id ? { vid: id, from: from || undefined } : null;
}

export async function fulfill(order: { id: string; sku: string; shipTo: ShipTo | null; message?: string }): Promise<FulfillResult> {
  if (!order.shipTo) return { ok: false, reason: "No shipping address" };

  if (cjEnabled()) {
    const { data: product } = await supabaseAdmin()
      .from("products").select("ships_by, supplier_ref").eq("sku", order.sku).maybeSingle();
    const cj = cjVid(product);
    if (cj) {
      try {
        let vid = cj.vid;
        if (!vid && cj.pid) {
          const detail = await cjProduct(cj.pid, cj.from ?? "US");
          vid = [...(detail.variants ?? [])].filter((v) => v.vid && Number(v.variantSellPrice) > 0)
            .sort((a, b) => Number(a.variantSellPrice) - Number(b.variantSellPrice))[0]?.vid;
        }
        if (!vid) throw new Error("CJ product has no variant to order");
        const cjId = await cjOrder({ id: order.id, vid, from: cj.from, shipTo: order.shipTo, message: order.message });
        return { ok: true, ref: `cj:${cjId}` };
      } catch (e) {
        // Don't lose the order: it falls back to "To ship" in /admin.
        console.error(`CJ order failed for ${order.id}:`, e);
      }
    }
  }
  return { ok: true, ref: `manual:${order.id}` };
}
