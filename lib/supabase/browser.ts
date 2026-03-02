import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Force "any" so Supabase doesn't infer tables as `never` during Vercel build
  return createBrowserClient(url, anonKey) as any;
}