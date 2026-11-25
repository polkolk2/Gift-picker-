/**
 * Who buys and ships the gift once it's paid for (and, for a gift link, claimed).
 *
 * Right now every order is "manual": it shows up under "To ship" in /admin with
 * the address, you buy or pack it and ship it, then press "Mark shipped".
 * When a supplier can drop-ship for you, add their API call below for products
 * whose ships_by is "supplier", and return their order number as ref.
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

export async function fulfill(order: { id: string; sku: string; shipTo: ShipTo | null; message?: string }): Promise<FulfillResult> {
  if (!order.shipTo) return { ok: false, reason: "No shipping address" };
  return { ok: true, ref: `manual:${order.id}` };
}
