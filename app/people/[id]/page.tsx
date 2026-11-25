import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { upcoming } from "@/lib/dates";
import type { LifeEvent, Recipient } from "@/lib/types";
import PersonForm from "../PersonForm";
import { addEvent } from "../actions";
import GiftFlow from "@/components/GiftFlow";
import { perkState } from "@/lib/perk";
import { PERK_PERCENT } from "@/lib/pricing";

export default async function Person({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const { data: person } = await supabase.from("recipients").select("*").eq("id", id).single<Recipient>();
  if (!person) notFound();
  const { data: events } = await supabase.from("events").select("*").eq("recipient_id", id);
  const soon = upcoming([person], (events ?? []) as LifeEvent[], 365);
  // The family discount is for the giver's own people, not a business's team.
  const perk = person.org_id ? null : await perkState(supabase, user.id);

  return (
    <main className="stack">
      <h1>{person.name}</h1>
      {soon[0] && <p className="when">{soon[0].title} in {soon[0].daysAway} days</p>}

      <GiftFlow recipientId={person.id} name={person.name} email={person.email} defaultOccasion={soon[0]?.occasion} signedIn perkPercent={perk?.has && perk.ready ? PERK_PERCENT : 0} />

      <section className="stack">
        <h2>Dates to remember</h2>
        <ul>{soon.map((u) => <li key={u.key}>{u.title}: {u.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</li>)}</ul>
        <form action={addEvent} className="row card">
          <input type="hidden" name="recipient_id" value={person.id} />
          <select name="kind" defaultValue="graduation">
            <option value="graduation">Graduation</option><option value="wedding">Wedding</option>
            <option value="new baby">New baby</option><option value="anniversary">Anniversary</option>
            <option value="holiday">Holiday</option><option value="other">Other</option>
          </select>
          <input name="title" placeholder="High school graduation" />
          <input name="event_date" type="date" required />
          <label style={{ flexDirection: "row", alignItems: "center" }}><input type="checkbox" name="recurs_yearly" /> Every year</label>
          <button className="btn ghost" type="submit">Add date</button>
        </form>
      </section>

      <section className="stack">
        <h2>Details</h2>
        <PersonForm person={person} />
      </section>
    </main>
  );
}
