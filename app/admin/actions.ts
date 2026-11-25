"use server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { OCCASIONS, STYLES } from "@/lib/types";

async function guard() {
  const { user } = await requireUser();
  if (!isAdmin(user)) notFound();
}
const list = (f: FormData, k: string) => String(f.get(k) ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const dollars = (f: FormData, k: string) => Math.round(Number(f.get(k) ?? 0) * 100) || null;

export async function saveProduct(form: FormData) {
  await guard();
  const sku = String(form.get("sku") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
  const price = dollars(form, "price");
  if (!sku || !price) return;
  await supabaseAdmin().from("products").upsert({
    sku,
    name: String(form.get("name") ?? "").trim().slice(0, 120),
    description: String(form.get("description") ?? "").trim().slice(0, 500) || null,
    price_cents: price,
    emoji: String(form.get("emoji") ?? "").trim().slice(0, 8) || null,
    tags: list(form, "tags"),
    styles: form.getAll("styles").map(String).filter((s) => (STYLES as readonly string[]).includes(s)),
    occasions: form.getAll("occasions").map(String).filter((s) => (OCCASIONS as readonly string[]).includes(s)),
    sex: ["f", "m"].includes(String(form.get("sex"))) ? String(form.get("sex")) : "any",
    age_min: Number(form.get("age_min") ?? 0) || 0,
    age_max: Number(form.get("age_max") ?? 120) || 120,
    image_url: String(form.get("image_url") ?? "").trim() || null,
    ships_by: form.get("ships_by") === "supplier" ? "supplier" : "self",
    supplier_ref: String(form.get("supplier_ref") ?? "").trim() || null,
    active: true,
  });
  revalidatePath("/admin");
}

export async function setActive(form: FormData) {
  await guard();
  await supabaseAdmin().from("products").update({ active: form.get("active") === "true" }).eq("sku", String(form.get("sku")));
  revalidatePath("/admin");
}

export async function markShipped(form: FormData) {
  await guard();
  await supabaseAdmin().from("orders").update({ status: "shipped" }).eq("id", String(form.get("id"))).eq("status", "ordered");
  revalidatePath("/admin");
}
