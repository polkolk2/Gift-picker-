import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { upcoming } from "@/lib/dates";
import type { LifeEvent, Recipient } from "@/lib/types";
import ImportContacts from "./ImportContacts";
import { perkState } from "@/lib/perk";
import { PERK_PERCENT } from "@/lib/pricing";

export default async function People({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: people } = await supabase.from("recipients").select("*").is("org_id", null).order("name");
  const { data: events } = await supabase.from("events").select("*");
  const list = (people ?? []) as Recipient[];
  const soon = upcoming(list, (events ?? []) as LifeEvent[], 90);
  const fromGoogle = user.app_metadata?.provider === "google";
  const perk = await perkState(supabase, user.id);

  return (
    <main className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>My people</h1>
        <Link className="btn" href="/people/new">Add someone</Link>
      </div>

      {perk.has && (
        <section className="perk stack">
          <h2>{perk.ready ? `Your next gift is ${PERK_PERCENT}% off` : `Add ${perk.needed} more ${perk.needed === 1 ? "person" : "people"} to get ${PERK_PERCENT}% off your next gift`}</h2>
          <p className="muted">
            {perk.ready
              ? "It comes off automatically at checkout."
              : `${welcome ? "Welcome! " : ""}A thank-you from ${perk.from} for joining after your gift. Add family and friends whose birthdays you want to remember.`}
          </p>
          {!perk.ready && <Link className="btn" href="/people/new">Add someone</Link>}
        </section>
      )}

      <section className="stack">
        <h2>Coming up</h2>
        {soon.length === 0 && <p className="muted">Nothing in the next 90 days. Add birthdays to see them here.</p>}
        <div className="grid">
          {soon.map((u) => (
            <Link key={u.key} href={`/people/${u.recipient.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <span className={`when ${u.daysAway <= 21 ? "soon" : ""}`}>{u.daysAway === 0 ? "Today" : `In ${u.daysAway} days`}</span>
              <strong>{u.title}</strong>
              <span className="muted">{u.date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>Everyone</h2>
        {list.length === 0 && <p className="muted">No one saved yet.</p>}
        <div className="grid">
          {list.map((r) => (
            <Link key={r.id} href={`/people/${r.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>{r.name}</strong>
              <span className="muted">{[r.relationship, r.city].filter(Boolean).join(" · ") || "Tap to add details"}</span>
            </Link>
          ))}
        </div>
        {fromGoogle && <ImportContacts />}
      </section>
    </main>
  );
}
