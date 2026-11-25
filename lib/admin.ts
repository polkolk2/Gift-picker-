import type { User } from "@supabase/supabase-js";

/** People allowed into /admin: a comma-separated list in ADMIN_EMAILS. */
export function isAdmin(user: User | null) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!user?.email && list.includes(user.email.toLowerCase());
}
