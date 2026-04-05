import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { email, redirectTo } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const redirect = redirectTo ?? `${process.env.NEXT_PUBLIC_SITE_URL}/partner/reset-password`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirect,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
