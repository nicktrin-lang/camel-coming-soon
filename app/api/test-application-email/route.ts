import { NextResponse } from "next/server";
import { sendApplicationReceivedEmail } from "@/lib/email";

function normalizeQueryEmail(value: string) {
  return String(value || "").trim().replace(/\s/g, "+").toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawEmail = String(searchParams.get("email") || "");
    const email = normalizeQueryEmail(rawEmail);

    console.log("🧪 test-application-email route called for raw:", rawEmail);
    console.log("🧪 test-application-email normalized email:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Missing ?email=you@example.com" },
        { status: 400 }
      );
    }

    const result = await sendApplicationReceivedEmail(email);

    return NextResponse.json(
      {
        ok: true,
        email,
        result,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("❌ test-application-email failed:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to send application received email" },
      { status: 500 }
    );
  }
}