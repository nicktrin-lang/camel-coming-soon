import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const URL          = "https://guhcavvpuveiovspzxmg.supabase.co";
const ANON         = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGNhdnZwdXZlaW92c3B6eG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI5MTAsImV4cCI6MjA4NzU4ODkxMH0.kR82AC-w4DxGsxoOxUHej9ezhgEdx2UHqPPkzb2PxCg";
const SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGNhdnZwdXZlaW92c3B6eG1nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAxMjkxMCwiZXhwIjoyMDg3NTg4OTEwfQ.horhbfOXzhT4nDFbh_GsfVy0lzxEL9yoz7ZZnTP-BUI";

export async function createCustomerServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL || URL,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY || ANON,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );
}

export function createCustomerServiceRoleSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL || URL,
    process.env.CUSTOMER_SUPABASE_SERVICE_ROLE_KEY || SERVICE_ROLE,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
