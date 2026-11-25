"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function savePerson(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const row = {
    owner_id: user.id,
    name: String(form.get("name") ?? "").trim(),
    relationship: String(form.get("relationship") ?? "").trim() || null,
    birthdate: String(form.get("birthdate") ?? "") || null,
    sex: String(form.get("sex") ?? "any"),
    city: String(form.get("city") ?? "").trim() || null,
    email: String(form.get("email") ?? "").trim() || null,
    likes: list(form.get("likes")),
    dislikes: list(form.get("dislikes")),
    budget_min: Number(form.get("budget_min") ?? 25),
    budget_max: Number(form.get("budget_max") ?? 75),
    notes: String(form.get("notes") ?? "").trim() || null,
  };
  if (!row.name) return;
  const id = String(form.get("id") ?? "");
  const q = id ? supabase.from("recipients").update(row).eq("id", id).select("id").single()
               : supabase.from("recipients").insert(row).select("id").single();
  const { data } = await q;
  revalidatePath("/people");
  redirect(`/people/${data?.id ?? ""}`);
}

export async function addEvent(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const recipientId = String(form.get("recipient_id"));
  await supabase.from("events").insert({
    owner_id: user.id,
    recipient_id: recipientId,
    kind: String(form.get("kind") ?? "other"),
    title: String(form.get("title") ?? "").trim() || "Special day",
    event_date: String(form.get("event_date")),
    recurs_yearly: form.get("recurs_yearly") === "on",
  });
  revalidatePath(`/people/${recipientId}`);
}

export async function importPeople(people: { name: string; birthdate: string }[]) {
  const { supabase, user } = await requireUser();
  if (!user || !people.length) return;
  await supabase.from("recipients").insert(
    people.slice(0, 200).map((p) => ({ owner_id: user.id, name: p.name.slice(0, 80), birthdate: p.birthdate, source: "google_contacts" })),
  );
  revalidatePath("/people");
}
