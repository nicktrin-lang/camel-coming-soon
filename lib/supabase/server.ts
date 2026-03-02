import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-aware Supabase client (uses anon key) — lets Route Handlers know who is logged in.
 */
export function createAuthedServerSupabaseClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Route Handlers this is allowed; if you ever call this in a Server Component,
        // Next may throw. Here we only use it in Route Handlers.
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Service role client (server-only) — use ONLY for DB reads/writes that must bypass RLS.
 * Never import this into client components.
 */
export function createServiceRoleSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
    db: { schema: "public" },
  });
}