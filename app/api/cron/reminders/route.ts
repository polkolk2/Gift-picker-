import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { upcoming, REMINDER_DAYS, type Upcoming } from "@/lib/dates";
import { sendEmail, site } from "@/lib/email";
import type { LifeEvent, Recipient } from "@/lib/types";

// Runs once a day (see vercel.json).
//  * Family givers hear about their own people's dates 21, 7 and 2 days out.
//  * Every admin of a business hears about its employees' birthdays and work anniversaries.
// Each reminder goes once per event per lead time (reminder_log).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: recipients } = await db.from("recipients").select("*").limit(100000);
  const { data: events } = await db.from("events").select("*").limit(100000);
  const { data: members } = await db.from("org_members").select("org_id, user_id");

  // Who hears about which people: the owner for family lists, every team member for a business.
  const listFor = new Map<string, { r: Recipient[]; e: LifeEvent[] }>();
  const add = (userId: string, r: Recipient) => {
    if (!listFor.has(userId)) listFor.set(userId, { r: [], e: [] });
    listFor.get(userId)!.r.push(r);
  };
  const teamOf = new Map<string, string[]>();
  for (const m of members ?? []) teamOf.set(m.org_id, [...(teamOf.get(m.org_id) ?? []), m.user_id]);
  for (const r of (recipients ?? []) as Recipient[]) {
    if (r.org_id) (teamOf.get(r.org_id) ?? []).forEach((u) => add(u, r));
    else add(r.owner_id, r);
  }
  for (const e of (events ?? []) as (LifeEvent & { owner_id: string })[]) listFor.get(e.owner_id)?.e.push(e);

  let sent = 0;
  for (const [userId, { r, e }] of listFor) {
    const due = upcoming(r, e, 30).filter((u) => REMINDER_DAYS.includes(u.daysAway));
    if (!due.length) continue;
    const keyOf = (u: Upcoming) => `${u.key}:${u.daysAway}`;
    const { data: already } = await db.from("reminder_log").select("key").eq("owner_id", userId).in("key", due.map(keyOf));
    const done = new Set((already ?? []).map((x) => x.key));
    const fresh = due.filter((u) => !done.has(keyOf(u)));
    if (!fresh.length) continue;

    const { data: who } = await db.auth.admin.getUserById(userId);
    const email = who.user?.email;
    if (!email) continue;
    const lines = fresh.map((u) => `${u.title} in ${u.daysAway} days. Pick a gift: ${site()}/people/${u.recipient.id}`);
    const ok = await sendEmail(
      email,
      fresh.length === 1 ? `${fresh[0].title} in ${fresh[0].daysAway} days` : `${fresh.length} gifts coming up`,
      lines.join("\n\n"),
    );
    if (ok) {
      await db.from("reminder_log").insert(fresh.map((u) => ({ owner_id: userId, key: keyOf(u) })));
      sent++;
    }
  }
  return NextResponse.json({ sent });
}
