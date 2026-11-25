import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, site } from "@/lib/email";

// Runs once a day. Gift links nobody claimed in time are marked expired and
// the giver is told. Refunds are issued from the Stripe dashboard (or add
// stripe.refunds.create here once you decide your refund rule).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: stale } = await db
    .from("orders")
    .update({ claim_status: "expired" })
    .eq("claim_status", "unclaimed")
    .lt("claim_expires_at", new Date().toISOString())
    .select("id, owner_id, product, recipient_name");
  for (const o of stale ?? []) {
    const { data: who } = await db.auth.admin.getUserById(o.owner_id);
    if (who.user?.email) {
      await sendEmail(
        who.user.email,
        `${o.recipient_name ?? "Your recipient"} didn't open their gift`,
        `The gift link for ${o.product?.name ?? "your gift"} expired before it was opened. Reply to this email and we'll refund you, or send it again: ${site()}/orders`,
      );
    }
  }
  return NextResponse.json({ expired: stale?.length ?? 0 });
}
