import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, site } from "./email";

/**
 * Gift links, the way Goody does it: the giver pays, the recipient gets a link,
 * types their own address (so the giver never needs it) and can swap for
 * anything worth the same or less. Nothing ships until they claim it.
 */
export const CLAIM_DAYS = Number(process.env.CLAIM_DAYS ?? 60);

export const giftUrl = (token: string) => `${site()}/g/${token}`;

const newToken = () => randomBytes(24).toString("base64url");

/** Turns a paid link order into a live link and emails it if we have an address. */
export async function issueGiftLink(db: SupabaseClient, orderId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + CLAIM_DAYS * 86_400_000).toISOString();
  const { data: o } = await db
    .from("orders")
    .update({ claim_token: token, claim_status: "unclaimed", claim_expires_at: expires })
    .eq("id", orderId)
    .is("claim_token", null) // only once
    .select("product, sender_name, recipient_email")
    .single();
  if (!o) return null;
  if (o.recipient_email) {
    const from = o.sender_name || "Someone";
    const note = o.product?.message ? `\n\n"${o.product.message}"` : "";
    await sendEmail(
      o.recipient_email,
      `${from} sent you a gift`,
      `${from} sent you ${o.product?.name ?? "a gift"}.${note}\n\nOpen your gift, add your address, or swap it for something else: ${giftUrl(token)}\n\nThe link works for ${CLAIM_DAYS} days.`,
    );
  }
  return token;
}
