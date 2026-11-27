import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { deliverableBy, productSource, rank, toPublic } from "@/lib/catalog";
import { choosePicks } from "@/lib/ai";
import { applyFallbackAnswers, readFinder } from "@/lib/finder";
import { amazonFor } from "@/lib/amazon-ideas";

// POST finder body (see lib/finder.ts), plus answers?: {q,a}[] in round 3.
// Rounds 1 and 2 rank the catalog by occasion, price, style and likes.
// With answers, Claude chooses (signed-in givers only, to keep AI costs in check).
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  const body = await req.json().catch(() => ({}));
  const f = await readFinder(body, supabase, user);
  if (!f) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  // Only gifts that can still arrive by their date.
  const catalog = deliverableBy(await productSource.list(), f.criteria.byDate);
  const answers: { q: string; a: string }[] = Array.isArray(body.answers)
    ? body.answers.slice(0, 5).map((x: { q?: unknown; a?: unknown }) => ({ q: String(x.q ?? "").slice(0, 200), a: String(x.a ?? "").slice(0, 100) }))
    : [];
  if (user && answers.length) {
    try {
      const picks = await choosePicks(f.who, catalog, f.exclude, answers, f.occasion);
      if (picks.length) return NextResponse.json({ picks: picks.map(toPublic), amazon: await amazonFor(f.criteria, picks.flatMap((p) => p.tags)), by: "claude", byDate: f.criteria.byDate });
    } catch (e) {
      console.error("choosePicks failed", e);
    }
  }
  const c = applyFallbackAnswers(f.criteria, answers);
  const picks = rank(catalog, c);
  // Under the picks: matching Amazon searches, as tagged affiliate links.
  return NextResponse.json({ picks: picks.map(toPublic), amazon: await amazonFor(c, picks.flatMap((p) => p.tags)), by: "ranking", byDate: c.byDate });
}
