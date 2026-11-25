import { supabaseAdmin } from "@/lib/supabase/server";
import type { ShipTo } from "@/lib/fulfillment";

/**
 * CJdropshipping (API 2.0). CJ_API_KEY comes from CJ's API page and lives in
 * Vercel's environment variables only.
 *
 * - The API key is swapped for an access token (good for 180 days), kept in the
 *   supplier_tokens table, which only the server can read.
 * - Orders are created unpaid by default (payType 3): you pay them in CJ under
 *   My Orders. Set CJ_AUTO_PAY=1 to pay each order from your CJ balance the
 *   moment it's created (payType 2).
 * - Set CJ_SANDBOX=1 to send test orders CJ won't ship or charge.
 */
const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const KEY = (process.env.CJ_API_KEY ?? "").trim();
export const cjEnabled = () => KEY.length > 0;

type CjReply<T> = { code: number; result: boolean; message: string; data: T };

let memo: { token: string; expires: number } | null = null;

async function token(): Promise<string> {
  const now = Date.now();
  if (memo && memo.expires - now > 86_400_000) return memo.token;

  const db = supabaseAdmin();
  const { data: row } = await db.from("supplier_tokens").select("token, expires_at").eq("supplier", "cj").maybeSingle();
  if (row && new Date(row.expires_at).getTime() - now > 86_400_000) {
    memo = { token: row.token, expires: new Date(row.expires_at).getTime() };
    return row.token;
  }

  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: KEY }),
  });
  const j = (await res.json()) as CjReply<{ accessToken: string; accessTokenExpiryDate: string }>;
  if (!j.result || !j.data?.accessToken) throw new Error(`CJ sign-in failed: ${j.message ?? res.status}`);
  const expires = new Date(j.data.accessTokenExpiryDate).getTime() || now + 170 * 86_400_000;
  memo = { token: j.data.accessToken, expires };
  await db.from("supplier_tokens").upsert({ supplier: "cj", token: j.data.accessToken, expires_at: new Date(expires).toISOString() });
  return j.data.accessToken;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CJ-Access-Token": await token() },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as CjReply<T>;
  if (!j.result) throw new Error(`CJ ${path}: ${j.message ?? res.status}`);
  return j.data;
}

/** CJ's cheapest shipping method for one item to that country. */
async function cheapestShipping(vid: string, from: string, to: string, zip?: string) {
  const opts = await call<{ logisticName: string; logisticPrice: number }[]>("/logistic/freightCalculate", {
    startCountryCode: from,
    endCountryCode: to,
    zip,
    products: [{ vid, quantity: 1 }],
  });
  const best = [...(opts ?? [])].sort((a, b) => a.logisticPrice - b.logisticPrice)[0];
  if (!best) throw new Error("CJ has no shipping to that address");
  return best.logisticName;
}

const countryName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
};

/** Place one gift with CJ. Returns CJ's order id. */
export async function cjOrder(o: { id: string; vid: string; shipTo: ShipTo; message?: string }) {
  const from = (process.env.CJ_FROM_COUNTRY ?? "US").toUpperCase();
  const to = (o.shipTo.country || "US").toUpperCase();
  const logisticName = await cheapestShipping(o.vid, from, to, o.shipTo.postal_code);
  const data = await call<{ orderId: string }>("/shopping/order/createOrderV2", {
    orderNumber: o.id,
    shippingCountryCode: to,
    shippingCountry: countryName(to),
    shippingProvince: o.shipTo.state,
    shippingCity: o.shipTo.city,
    shippingZip: o.shipTo.postal_code,
    shippingCustomerName: o.shipTo.name,
    shippingAddress: o.shipTo.line1,
    shippingAddress2: o.shipTo.line2 ?? undefined,
    logisticName,
    fromCountryCode: from,
    remark: o.message ? o.message.slice(0, 200) : undefined,
    payType: process.env.CJ_AUTO_PAY === "1" ? 2 : 3,
    isSandbox: process.env.CJ_SANDBOX === "1" ? 1 : 0,
    products: [{ vid: o.vid, quantity: 1 }],
  });
  return data.orderId;
}
