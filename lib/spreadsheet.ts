import { NO_YEAR } from "./dates";

/**
 * Reads an employee list exported from Excel, Google Sheets or an HR system
 * (BambooHR, Gusto, Rippling...): a CSV file, or rows pasted straight from a
 * spreadsheet. Column names are matched loosely, so "Full Name", "Work Email",
 * "Date of Birth" and "Hire Date" all work.
 */
export type EmployeeRow = {
  name: string; email: string | null; birthdate: string | null; work_start: string | null; department: string | null;
};

function splitRows(text: string): string[][] {
  const delim = text.split("\n")[0].includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** 2014-12-08, 12/8/2014, 12/8/14, 12/08 (no year), Dec 8 2014, Dec 8. US month-first order. */
export function parseDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  let y: number | null = null, m: number, d: number;
  let x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (x) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/))) {
    m = +x[1]; d = +x[2];
    if (x[3]) y = x[3].length === 2 ? (+x[3] > 30 ? 1900 + +x[3] : 2000 + +x[3]) : +x[3];
  } else if ((x = s.toLowerCase().match(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/))) {
    m = MONTHS.indexOf(x[1]) + 1; d = +x[2]; if (x[3]) y = +x[3];
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y ?? NO_YEAR}-${pad(m)}-${pad(d)}`;
}

const find = (headers: string[], names: string[]) => headers.findIndex((h) => names.includes(h));

export function readEmployees(text: string): { rows: EmployeeRow[]; skipped: number; missing: string[] } {
  const all = splitRows(text.replace(/^﻿/, ""));
  if (all.length < 2) return { rows: [], skipped: 0, missing: ["a header row and at least one person"] };
  const h = all[0].map((c) => c.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim());
  const col = {
    name: find(h, ["name", "full name", "employee", "employee name", "preferred name"]),
    first: find(h, ["first name", "first", "given name", "preferred first name"]),
    last: find(h, ["last name", "last", "surname", "family name"]),
    email: find(h, ["email", "work email", "email address", "personal email"]),
    birth: find(h, ["birthday", "birthdate", "birth date", "date of birth", "dob"]),
    start: find(h, ["start date", "hire date", "date hired", "start", "work anniversary", "original hire date"]),
    dept: find(h, ["department", "team", "group", "division"]),
  };
  const missing: string[] = [];
  if (col.name < 0 && col.first < 0) missing.push("a Name column");
  if (col.birth < 0 && col.start < 0) missing.push("a Birthday or Start date column");
  if (missing.length) return { rows: [], skipped: 0, missing };

  const rows: EmployeeRow[] = [];
  let skipped = 0;
  for (const r of all.slice(1)) {
    const name = (col.name >= 0 ? r[col.name] : [r[col.first], col.last >= 0 ? r[col.last] : ""].join(" ")).trim();
    const email = col.email >= 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r[col.email] ?? "") ? r[col.email].toLowerCase() : null;
    const birthdate = col.birth >= 0 ? parseDate(r[col.birth] ?? "") : null;
    const work_start = col.start >= 0 ? parseDate(r[col.start] ?? "") : null;
    if (!name || (!birthdate && !work_start)) { skipped++; continue; }
    rows.push({
      name: name.slice(0, 80), email, birthdate,
      work_start: work_start && !work_start.startsWith(String(NO_YEAR)) ? work_start : null,
      department: col.dept >= 0 ? (r[col.dept] || null)?.slice(0, 60) ?? null : null,
    });
  }
  return { rows: rows.slice(0, 2000), skipped: skipped + Math.max(0, rows.length - 2000), missing };
}
