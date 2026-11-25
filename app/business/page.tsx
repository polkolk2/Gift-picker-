import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myOrg } from "@/lib/org";
import { upcoming } from "@/lib/dates";
import type { Recipient } from "@/lib/types";
import { createOrg } from "./actions";

export default async function Business() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const org = await myOrg(supabase, user);

  if (!org) {
    return (
      <main className="stack narrow">
        <h1>Gift Picker for teams</h1>
        <p className="muted">Never miss an employee&rsquo;s birthday or work anniversary. Upload your team once, get a reminder before each one, and send a gift link they can swap.</p>
        <form action={createOrg} className="stack card">
          <label>Company name<input name="name" required maxLength={80} autoComplete="organization" /></label>
          <button className="btn" type="submit">Create my team account</button>
        </form>
      </main>
    );
  }

  const { data } = await supabase.from("recipients").select("*").eq("org_id", org.id).order("name");
  const team = (data ?? []) as Recipient[];
  const soon = upcoming(team, [], 60);
  return (
    <main className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{org.name}</h1>
        <Link className="btn" href="/business/import">Import employees</Link>
      </div>

      <section className="stack">
        <h2>Next 60 days</h2>
        {soon.length === 0 && <p className="muted">{team.length ? "Nothing coming up." : "Import your team to see birthdays and work anniversaries here."}</p>}
        <div className="grid">
          {soon.map((u) => (
            <Link key={u.key} href={`/people/${u.recipient.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="when">{u.daysAway === 0 ? "Today" : `In ${u.daysAway} days`}</span>
              <strong>{u.title}</strong>
              <span className="muted">{[u.recipient.department, u.date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })].filter(Boolean).join(" · ")}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>Team ({team.length})</h2>
        <div className="grid">
          {team.map((r) => (
            <Link key={r.id} href={`/people/${r.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>{r.name}</strong>
              <span className="muted">{[r.department, r.email].filter(Boolean).join(" · ") || "Tap to add details"}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
