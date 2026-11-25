import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myOrg } from "@/lib/org";
import ImportForm from "./ImportForm";

export default async function Import() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");
  const org = await myOrg(supabase, user);
  if (!org) redirect("/business");
  return (
    <main className="stack">
      <h1>Import your team</h1>
      <p className="muted">
        Upload a CSV, or copy the rows from Excel or Google Sheets and paste them below. We need a name and a birthday or
        start date for each person. An email lets you send them gift links. Most HR systems (Gusto, BambooHR, Rippling)
        can export this as a CSV.
      </p>
      <ImportForm />
    </main>
  );
}
