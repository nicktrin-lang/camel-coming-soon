import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { createCustomerServiceRoleSupabaseClient } from "@/lib/supabase-customer/server";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getCustomerUserFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;

  const customerSupabase = createCustomerServiceRoleSupabaseClient();
  const { data, error } = await customerSupabase.auth.getUser(accessToken);

  if (error || !data?.user) return null;
  return data.user;
}

const ALLOWED_FUEL_LEVELS = [
  "empty",
  "quarter",
  "half",
  "three_quarter",
  "full",
] as const;

type AllowedFuelLevel = (typeof ALLOWED_FUEL_LEVELS)[number];

function normalizeFuelLevel(value: unknown): AllowedFuelLevel | null {
  const clean = String(value || "").trim().toLowerCase();
  if (
    clean === "empty" ||
    clean === "quarter" ||
    clean === "half" ||
    clean === "three_quarter" ||
    clean === "full"
  ) {
    return clean;
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = getBearerToken(req);
    const customerUser = await getCustomerUserFromAccessToken(accessToken);

    if (!customerUser) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);

    const section = String(body?.section || "").trim().toLowerCase();

    if (section !== "collection" && section !== "return") {
      return NextResponse.json(
        { error: "Section must be collection or return" },
        { status: 400 }
      );
    }

    const confirmed = !!body?.confirmed;
    const fuelLevel = normalizeFuelLevel(body?.fuel_level);
    const notes = String(body?.notes || "").trim() || null;

    if (!fuelLevel) {
      return NextResponse.json(
        { error: "Valid fuel level is required" },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const { data: bookingRow, error: bookingErr } = await db
      .from("partner_bookings")
      .select(`
        id,
        request_id,
        customer_requests!inner (
          id,
          customer_user_id
        )
      `)
      .eq("id", id)
      .eq("customer_requests.customer_user_id", customerUser.id)
      .maybeSingle();

    if (bookingErr) {
      return NextResponse.json({ error: bookingErr.message }, { status: 400 });
    }

    if (!bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    const updatePayload =
      section === "collection"
        ? {
            collection_confirmed_by_customer: confirmed,
            collection_confirmed_by_customer_at: confirmed ? nowIso : null,
            collection_fuel_level_customer: fuelLevel,
            collection_customer_notes: notes,
          }
        : {
            return_confirmed_by_customer: confirmed,
            return_confirmed_by_customer_at: confirmed ? nowIso : null,
            return_fuel_level_customer: fuelLevel,
            return_customer_notes: notes,
          };

    const { error: updateErr } = await db
      .from("partner_bookings")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}