import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { productSource, rank, toPublic } from "@/lib/catalog";
import { choosePicks } from "@/lib/ai";
import { applyFallbackAnswers, readFinder } from "@/lib/finder";

// POST finder body (see lib/finder.ts), plus answers?: {q,a}[] in round 3.
// Rounds 1 and 2 rank the catalog by occasion, price, style and likes.
// With answers, Claude chooses (signed-in givers only, to keep AI costs in check).
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  const body = await req.json().catch(() => ({}));
  const f = await readFinder(body, supabase, user);
  if (!f) return NextResponse.json({ error: "Person not found" }, { status: 404 });

  const catalog = await productSource.list();
  const answers: { q: string; a: string }[] = Array.isArray(body.answers)
    ? body.answers.slice(0, 5).map((x: { q?: unknown; a?: unknown }) => ({ q: String(x.q ?? "").slice(0, 200), a: String(x.a ?? "").slice(0, 100) }))
    : [];
  if (user && answers.length) {
    try {
      const picks = await choosePicks(f.who, catalog, f.exclude, answers, f.occasion);
      if (picks.length) return NextResponse.json({ picks: picks.map(toPublic), by: "claude" });
    } catch (e) {
      console.error("choosePicks failed", e);
    }
  }
  return NextResponse.json({ picks: rank(catalog, applyFallbackAnswers(f.criteria, answers)).map(toPublic), by: "ranking" });
}
