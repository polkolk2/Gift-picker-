import { Resend } from "resend";

export const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Sends one plain-text email. Returns false instead of throwing so a failed email never breaks an order. */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.REMINDER_FROM ?? "Gift Picker <gifts@example.com>",
      to, subject, text,
    });
    return !error;
  } catch {
    return false;
  }
}
