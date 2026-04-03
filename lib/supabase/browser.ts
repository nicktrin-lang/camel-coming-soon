import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      storageKey: "sb-portal-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      detectSessionInUrl: true,
    },
  }) as any;
}
