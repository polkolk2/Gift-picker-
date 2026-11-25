import type { LifeEvent, Recipient } from "./types";

export type Upcoming = {
  key: string;            // stable id for reminder de-duplication
  recipient: Recipient;
  title: string;
  date: Date;
  daysAway: number;
  occasion: string;       // matches OCCASIONS in lib/types.ts, for the gift finder
};

/** Birthdays imported without a year are stored with this year and shown without an age. */
export const NO_YEAR = 1904;

const KIND_TO_OCCASION: Record<string, string> = {
  graduation: "graduation", wedding: "wedding", baby: "new baby", "new baby": "new baby",
  anniversary: "anniversary", holiday: "holiday",
};

const DAY = 86_400_000;

function startOfToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Next occurrence of a yyyy-mm-dd date (same month and day) on or after today. */
export function nextAnnual(iso: string, now = new Date()) {
  const [, m, d] = iso.split("-").map(Number);
  const today = startOfToday(now);
  let next = new Date(Date.UTC(today.getUTCFullYear(), m - 1, d));
  if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, m - 1, d));
  return next;
}

export function ageOn(birthdate: string | null, on: Date) {
  if (!birthdate) return null;
  const [y, m, d] = birthdate.split("-").map(Number);
  if (y === NO_YEAR) return null;
  let age = on.getUTCFullYear() - y;
  if (on.getUTCMonth() + 1 < m || (on.getUTCMonth() + 1 === m && on.getUTCDate() < d)) age--;
  return age;
}

/** Everything coming up for a giver's people, soonest first. */
export function upcoming(recipients: Recipient[], events: LifeEvent[], withinDays = 365, now = new Date()): Upcoming[] {
  const today = startOfToday(now);
  const out: Upcoming[] = [];
  for (const r of recipients) {
    if (!r.birthdate) continue;
    const date = nextAnnual(r.birthdate, now);
    const turning = ageOn(r.birthdate, new Date(date.getTime() + DAY));
    out.push({
      key: `bday:${r.id}:${date.getUTCFullYear()}`,
      recipient: r,
      title: turning != null ? `${r.name} turns ${turning}` : `${r.name}'s birthday`,
      date,
      daysAway: Math.round((date.getTime() - today.getTime()) / DAY),
      occasion: "birthday",
    });
  }
  for (const r of recipients) {
    if (!r.work_start) continue;
    const date = nextAnnual(r.work_start, now);
    const years = date.getUTCFullYear() - Number(r.work_start.slice(0, 4));
    if (years < 1) continue;
    out.push({
      key: `work:${r.id}:${date.getUTCFullYear()}`,
      recipient: r,
      title: `${r.name}'s ${years}-year work anniversary`,
      date,
      daysAway: Math.round((date.getTime() - today.getTime()) / DAY),
      occasion: "work anniversary",
    });
  }
  const byId = new Map(recipients.map((r) => [r.id, r]));
  for (const e of events) {
    const r = byId.get(e.recipient_id);
    if (!r) continue;
    const date = e.recurs_yearly ? nextAnnual(e.event_date, now) : new Date(e.event_date + "T00:00:00Z");
    const daysAway = Math.round((date.getTime() - today.getTime()) / DAY);
    if (daysAway < 0) continue;
    out.push({ key: `ev:${e.id}:${date.getUTCFullYear()}`, recipient: r, title: e.title, date, daysAway, occasion: KIND_TO_OCCASION[e.kind] ?? "birthday" });
  }
  return out.filter((u) => u.daysAway <= withinDays).sort((a, b) => a.daysAway - b.daysAway);
}

/** Days before an event when the giver hears from us. */
export const REMINDER_DAYS = [21, 7, 2];
