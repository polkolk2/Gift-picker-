import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { productSource } from "@/lib/catalog";
import { writeQuestions } from "@/lib/ai";
import { FALLBACK, readFinder } from "@/lib/finder";

// POST finder body (see lib/finder.ts)
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  const body = await req.json().catch(() => ({}));
  const f = await readFinder(body, supabase, user);
  if (!f) return NextResponse.json({ error: "Person not found" }, { status: 404 });
  if (!user) return NextResponse.json({ questions: FALLBACK, by: "fallback" });

  const catalog = await productSource.list();
  const rejected = catalog.filter((p) => f.exclude.includes(p.sku)).map((p) => p.name);
  try {
    const questions = await writeQuestions(f.who, rejected, f.occasion);
    if (questions.length) return NextResponse.json({ questions, by: "claude" });
  } catch (e) {
    console.error("writeQuestions failed", e);
  }
  return NextResponse.json({ questions: FALLBACK, by: "fallback" });
}
