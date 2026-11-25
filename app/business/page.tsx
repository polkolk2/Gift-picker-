import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { GIFT_KINDS, kindById, myOrg } from "@/lib/org";
import { upcoming } from "@/lib/dates";
import { INTERESTS, STYLES, type Recipient } from "@/lib/types";
import { createOrg, saveGiftStyle } from "./actions";

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

      <details className="card stack">
        <summary>
          <strong>Gift style:</strong> {kindById(org.gift_kind)?.label ?? "Not set"}
          {org.gift_min && org.gift_max ? `, $${org.gift_min} to $${org.gift_max}` : ""}
        </summary>
        <p className="muted">We set this from your company&rsquo;s name. It decides the price range and kind of gifts your team sees.</p>
        <form action={saveGiftStyle} className="stack">
          <label>Type of company
            <select name="gift_kind" defaultValue={org.gift_kind ?? "custom"}>
              {GIFT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </label>
          <div className="row">
            <label>From $<input name="gift_min" type="number" min={1} max={5000} defaultValue={org.gift_min ?? 25} /></label>
            <label>Up to $<input name="gift_max" type="number" min={1} max={5000} defaultValue={org.gift_max ?? 75} /></label>
          </div>
          <fieldset className="stack">
            <legend>Kinds of gift to favor (up to 4)</legend>
            <div className="row">
              {STYLES.map((s) => (
                <label key={s}><input type="checkbox" name="gift_styles" value={s} defaultChecked={org.gift_styles?.includes(s)} /> {s}</label>
              ))}
            </div>
          </fieldset>
          <fieldset className="stack">
            <legend>Leave out</legend>
            <div className="row">
              {INTERESTS.map((s) => (
                <label key={s}><input type="checkbox" name="gift_avoid" value={s} defaultChecked={org.gift_avoid?.includes(s)} /> {s}</label>
              ))}
            </div>
          </fieldset>
          <button className="btn" type="submit">Save gift style</button>
        </form>
      </details>

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
