import { createBrowserClient } from "@supabase/ssr";

let client: any = null;

export function createCustomerBrowserClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY!
  );
  return client;
}
