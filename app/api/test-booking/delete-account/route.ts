import { NextResponse } from "next/server";
import { createCustomerServerClient } from "@/lib/supabase-customer/server";

export async function POST() {
  try {
    const supabase = await createCustomerServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = userData.user.id;

    // Soft delete — stamp deleted_at
    const { error: updateErr } = await supabase
      .from("customer_profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Sign out
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}