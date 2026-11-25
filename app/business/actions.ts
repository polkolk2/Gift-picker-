"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { guessKind, myOrg, readGiftStyle, styleFromKind } from "@/lib/org";
import type { EmployeeRow } from "@/lib/spreadsheet";

/** Business sign-up: one field. The signed-in person becomes the first admin. */
export async function createOrg(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  if (await myOrg(supabase, user)) redirect("/business");
  const db = supabaseAdmin();
  // Start from what the name says about the company (a burger chain and a jeweler get different gifts).
  const { data: org } = await db.from("orgs").insert({ name, created_by: user.id, ...styleFromKind(guessKind(name)) }).select("id").single();
  if (org) await db.from("org_members").insert({ org_id: org.id, user_id: user.id, role: "admin" });
  redirect("/business/import");
}

/** Saves the gift style a business picked on its settings form. Admins only. */
export async function saveGiftStyle(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const org = await myOrg(supabase, user);
  if (!org) redirect("/business");
  const { data: me } = await supabase.from("org_members").select("role").eq("org_id", org.id).eq("user_id", user.id).maybeSingle();
  if (me?.role !== "admin") return;
  await supabaseAdmin().from("orgs").update(readGiftStyle(form)).eq("id", org.id);
  revalidatePath("/business");
}

/** Adds employees from a spreadsheet. People already on the list (same email, or same name and birthday) are skipped. */
export async function importEmployees(rows: EmployeeRow[]): Promise<{ added: number; already: number }> {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const org = await myOrg(supabase, user);
  if (!org) redirect("/business");

  const { data: existing } = await supabase.from("recipients").select("name,email,birthdate").eq("org_id", org.id);
  const emails = new Set((existing ?? []).map((r) => r.email).filter(Boolean));
  const keys = new Set((existing ?? []).map((r) => `${r.name.toLowerCase()}|${r.birthdate ?? ""}`));
  const fresh = rows.slice(0, 2000).filter((r) => {
    const k = `${r.name.toLowerCase()}|${r.birthdate ?? ""}`;
    if ((r.email && emails.has(r.email)) || keys.has(k)) return false;
    if (r.email) emails.add(r.email);
    keys.add(k);
    return true;
  });
  const clean = (v: string | null, re: RegExp) => (v && re.test(v) ? v : null);
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  for (let i = 0; i < fresh.length; i += 500) {
    await supabase.from("recipients").insert(
      fresh.slice(i, i + 500).map((r) => ({
        owner_id: user.id, org_id: org.id, source: "spreadsheet",
        name: String(r.name).slice(0, 80),
        email: clean(r.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        birthdate: clean(r.birthdate, DATE),
        work_start: clean(r.work_start, DATE),
        department: r.department ? String(r.department).slice(0, 60) : null,
        relationship: "employee",
      })),
    );
  }
  revalidatePath("/business");
  return { added: fresh.length, already: rows.length - fresh.length };
}
