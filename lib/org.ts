import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Org = { id: string; name: string };

/** The business this signed-in user belongs to, if any (the first one for now). */
export async function myOrg(supabase: SupabaseClient, user: User): Promise<Org | null> {
  const { data } = await supabase.from("org_members").select("orgs(id,name)").eq("user_id", user.id).limit(1).maybeSingle();
  return (data?.orgs as unknown as Org) ?? null;
}
