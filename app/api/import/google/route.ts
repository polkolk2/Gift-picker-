import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// GET: lists the giver's Google Contacts that have a birthday saved, so they can
// tick who to add. Needs the Google sign-in to have asked for contacts.readonly
// (see app/login/LoginButtons.tsx) and the provider token from that sign-in.
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token;
  if (!token) return NextResponse.json({ error: "Sign in with Google again to import contacts" }, { status: 400 });

  const people: { name: string; birthdate: string }[] = [];
  let pageToken = "";
  for (let i = 0; i < 10; i++) {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,birthdays");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return NextResponse.json({ error: "Google didn't share contacts" }, { status: 502 });
    const json = await res.json();
    for (const p of json.connections ?? []) {
      const name = p.names?.[0]?.displayName;
      const d = p.birthdays?.find((b: { date?: { month?: number; day?: number } }) => b.date?.month && b.date?.day)?.date;
      if (!name || !d) continue;
      const y = d.year ?? 2000; // year unknown: age-based ranking is skipped later if you prefer
      people.push({ name, birthdate: `${y}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` });
    }
    pageToken = json.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return NextResponse.json({ people });
}
