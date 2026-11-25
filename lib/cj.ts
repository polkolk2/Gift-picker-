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

  await pace();
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

// CJ allows about one call a second on a new account, so space them out.
let last = 0;
async function pace() {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

async function call<T>(path: string, body: unknown): Promise<T> {
  await pace();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CJ-Access-Token": await token() },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as CjReply<T>;
  if (!j.result) throw new Error(`CJ ${path}: ${j.message ?? res.status}`);
  return j.data;
}

async function get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  await pace();
  const res = await fetch(`${BASE}${path}?${q}`, { headers: { "CJ-Access-Token": await token() } });
  const j = (await res.json()) as CjReply<T>;
  if (!j.result) throw new Error(`CJ ${path}: ${j.message ?? res.status}`);
  return j.data;
}

/** CJ's cheapest shipping method for one item to that country, with its price in USD. */
export async function cheapestShipping(vid: string, from: string, to: string, zip?: string) {
  const opts = await call<{ logisticName: string; logisticPrice: number; logisticAging?: string }[]>("/logistic/freightCalculate", {
    startCountryCode: from,
    endCountryCode: to,
    zip,
    products: [{ vid, quantity: 1 }],
  });
  const best = [...(opts ?? [])].sort((a, b) => Number(a.logisticPrice) - Number(b.logisticPrice))[0];
  if (!best) throw new Error("CJ has no shipping to that address");
  return { name: best.logisticName, usd: Number(best.logisticPrice), days: best.logisticAging ?? null };
}

export type CjHit = { id: string; nameEn: string; bigImage?: string; sellPrice?: string };

/** Search CJ's catalog. countryCode limits it to items stocked in that country's warehouse. */
export async function cjSearch(keyWord: string, countryCode?: string, size = 5): Promise<CjHit[]> {
  const data = await get<{ content?: { productList?: CjHit[] }[] }>("/product/listV2", { keyWord, countryCode, size, page: 1, orderBy: 0 });
  return (data?.content ?? []).flatMap((c) => c.productList ?? []);
}

export type CjVariant = { vid: string; variantNameEn?: string; variantSellPrice: number; variantImage?: string };
export type CjProduct = { pid: string; productNameEn: string; bigImage?: string; sellPrice?: number | string; status?: string; variants?: CjVariant[] };

export async function cjProduct(pid: string, countryCode?: string): Promise<CjProduct> {
  return get<CjProduct>("/product/query", { pid, countryCode });
}

const countryName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
};

/** Place one gift with CJ. Returns CJ's order id. */
export async function cjOrder(o: { id: string; vid: string; from?: string; shipTo: ShipTo; message?: string }) {
  const from = (o.from || process.env.CJ_FROM_COUNTRY || "US").toUpperCase();
  const to = (o.shipTo.country || "US").toUpperCase();
  const { name: logisticName } = await cheapestShipping(o.vid, from, to, o.shipTo.postal_code);
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
