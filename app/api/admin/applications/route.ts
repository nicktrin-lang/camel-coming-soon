import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendApprovalEmail } from "@/lib/email";

function getAdminEmails() {
  const raw = process.env.CAMEL_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type StatusValue = "pending" | "approved" | "rejected";

function isAllowedStatus(s: any): s is StatusValue {
  return s === "pending" || s === "approved" || s === "rejected";
}

// GET /api/admin/applications?email=admin@x.com
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").toLowerCase().trim();

    const admins = getAdminEmails();
    if (!email || !admins.includes(email)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("partner_applications")
      .select("id,email,company_name,full_name,status,created_at,user_id")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/applications
// body: { adminEmail, id, status }
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const adminEmail = (body?.adminEmail || "").toLowerCase().trim();
    const id = body?.id;
    const nextStatus = body?.status;

    const admins = getAdminEmails();
    if (!adminEmail || !admins.includes(adminEmail)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (!isAllowedStatus(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid status (must be pending, approved, or rejected)" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1) Read current
    const { data: current, error: currentErr } = await supabase
      .from("partner_applications")
      .select("id,email,status")
      .eq("id", id)
      .single();

    if (currentErr) {
      return NextResponse.json({ error: currentErr.message }, { status: 400 });
    }

    const prevStatus = (current?.status || "").toLowerCase() as StatusValue;

    // 2) Update
    const { data: updated, error: updateErr } = await supabase
      .from("partner_applications")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id,status,email")
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    const updatedStatus = (updated?.status || "").toLowerCase() as StatusValue;
    const toEmail = updated?.email || current?.email || null;

    // 3) Email ONLY when changed → approved
    const becameApproved = prevStatus !== "approved" && updatedStatus === "approved";

    if (becameApproved && toEmail) {
      try {
        // If your email helper supports a URL, pass it in; if not, it can read PORTAL_BASE_URL itself.
        await sendApprovalEmail(toEmail);
      } catch (emailErr: any) {
        return NextResponse.json(
          {
            data: updated,
            warning: emailErr?.message || "Approved but failed to send email",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}