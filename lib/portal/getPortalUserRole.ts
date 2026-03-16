import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { normalizePortalRole, type PortalRole } from "@/lib/portal/roles";

export async function getPortalUserRole() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();

  if (userErr || !userData?.user) {
    return {
      user: null,
      role: null as PortalRole | null,
      error: "Not signed in",
    };
  }

  const user = userData.user;
  const db = createServiceRoleSupabaseClient();

  const { data: profile, error: profileErr } = await db
    .from("partner_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileErr) {
    return {
      user,
      role: null as PortalRole | null,
      error: profileErr.message,
    };
  }

  return {
    user,
    role: normalizePortalRole(profile?.role),
    error: null as string | null,
  };
}