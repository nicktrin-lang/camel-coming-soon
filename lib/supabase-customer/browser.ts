import { createClient } from "@supabase/supabase-js";

export function createCustomerBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: "sb-customer-auth",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        detectSessionInUrl: true,
      },
    }
  );
}
