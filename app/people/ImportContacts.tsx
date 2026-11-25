"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { importPeople } from "./actions";

type Found = { name: string; birthdate: string };

export default function ImportContacts() {
  const [found, setFound] = useState<Found[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const router = useRouter();

  async function load() {
    setNote("Looking for birthdays in your Google Contacts...");
    const res = await fetch("/api/import/google");
    const json = await res.json();
    if (!res.ok) return setNote(json.error ?? "Couldn't read your contacts.");
    setFound(json.people);
    setNote(json.people.length ? "" : "None of your contacts have a birthday saved.");
  }

  async function save() {
    await importPeople(found!.filter((_, i) => picked.has(i)));
    setFound(null);
    router.refresh();
  }

  return (
    <div className="card">
      <strong>Bring in birthdays from Google Contacts</strong>
      {!found && <button className="btn ghost" onClick={load}>Find birthdays</button>}
      {found && found.length > 0 && (
        <>
          <div className="chips">
            {found.map((p, i) => (
              <button key={i} className={`chip ${picked.has(i) ? "on" : ""}`} onClick={() => {
                const next = new Set(picked); if (next.has(i)) next.delete(i); else next.add(i); setPicked(next);
              }}>{p.name}</button>
            ))}
          </div>
          <button className="btn" disabled={!picked.size} onClick={save}>Add {picked.size} people</button>
        </>
      )}
      {note && <p className="muted">{note}</p>}
    </div>
  );
}
