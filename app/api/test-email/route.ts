import { NextResponse } from "next/server";
import {
  sendApplicationReceivedEmail,
  sendApprovalEmail,
  sendAccountLiveEmail,
} from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const to = String(searchParams.get("to") || "").trim().toLowerCase();
    const type = String(searchParams.get("type") || "application").trim().toLowerCase();

    if (!to) {
      return NextResponse.json(
        { error: "Missing ?to=email@example.com" },
        { status: 400 }
      );
    }

    let result: any = null;

    if (type === "application") {
      result = await sendApplicationReceivedEmail(to);
    } else if (type === "approval") {
      result = await sendApprovalEmail(to);
    } else if (type === "live") {
      result = await sendAccountLiveEmail(to);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use application, approval, or live." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        type,
        to,
        result,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("❌ test-email failed:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}