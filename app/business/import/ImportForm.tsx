"use client";
import { useState } from "react";
import Link from "next/link";
import { readEmployees, type EmployeeRow } from "@/lib/spreadsheet";
import { NO_YEAR } from "@/lib/dates";
import { importEmployees } from "../actions";

const TEMPLATE = "Name,Email,Birthday,Start date,Department\nJordan Lee,jordan@yourco.com,03/14,2021-06-01,Sales\n";
const show = (d: string | null) => (d ? (d.startsWith(String(NO_YEAR)) ? d.slice(5) : d) : "");

export default function ImportForm() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<{ added: number; already: number } | null>(null);
  const [busy, setBusy] = useState(false);

  function read(text: string) {
    const r = readEmployees(text);
    setRows(r.rows); setDone(null);
    setNote(r.missing.length ? `We couldn't find ${r.missing.join(" or ")}. Check the first row has column names.` :
      `${r.rows.length} people ready.${r.skipped ? ` ${r.skipped} rows skipped (no name, or no birthday or start date).` : ""}`);
  }
  async function save() {
    setBusy(true);
    setDone(await importEmployees(rows));
    setBusy(false); setRows([]);
  }

  return (
    <div className="stack">
      <div className="row">
        <input type="file" accept=".csv,text/csv,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) read(await f.text()); }} />
        <a className="btn ghost" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="team-template.csv">Download a template</a>
      </div>
      <textarea rows={5} placeholder="Or paste rows here, with the column names on the first line" onChange={(e) => e.target.value.trim() && read(e.target.value)} />
      {note && <p className="muted">{note}</p>}

      {rows.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th align="left">Name</th><th align="left">Email</th><th align="left">Birthday</th><th align="left">Start date</th><th align="left">Department</th></tr></thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td>{r.email}</td><td>{show(r.birthdate)}</td><td>{show(r.work_start)}</td><td>{r.department}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 && <p className="muted">and {rows.length - 8} more</p>}
          <button className="btn" disabled={busy} onClick={save}>{busy ? "Importing..." : `Import ${rows.length} people`}</button>
        </>
      )}
      {done && (
        <p className="when">
          Added {done.added}.{done.already ? ` ${done.already} were already on your list.` : ""} <Link href="/business">See your team</Link>
        </p>
      )}
    </div>
  );
}
