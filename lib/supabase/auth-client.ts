import { createClient } from "@supabase/supabase-js";

const URL  = "https://guhcavvpuveiovspzxmg.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGNhdnZwdXZlaW92c3B6eG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI5MTAsImV4cCI6MjA4NzU4ODkxMH0.kR82AC-w4DxGsxoOxUHej9ezhgEdx2UHqPPkzb2PxCg";

export function createAuthSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ANON,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: "camel-auth-reset",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );
}

export function createCustomerAuthSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL || URL,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY || ANON,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: "camel-customer-auth-reset",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );
}
