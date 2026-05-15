/**
 * Booking Confirmation Receipt PDF generator — camel-customer
 * Generated server-side after payment succeeds.
 * Stored in Supabase Storage + emailed to customer as attachment.
 *
 * Uses charge_currency (what customer actually paid) throughout.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

// ── Supabase storage bucket ───────────────────────────────────────────────────
const BUCKET = "booking-receipts";

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 9, color: "#222", backgroundColor: "#fff", paddingBottom: 40 },
  topBar:      { backgroundColor: "#ff7a00", height: 8 },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: "16 24 12 24", borderBottom: "1 solid #e5e5e5" },
  logo:        { width: 90, height: 28, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 7, color: "#888", marginBottom: 2 },
  headerDate:  { fontSize: 8, color: "#555" },
  body:        { padding: "20 24" },
  title:       { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111", marginBottom: 4 },
  subtitle:    { fontSize: 9, color: "#888", marginBottom: 16 },
  section:     { marginBottom: 14 },
  sectionHead: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ff7a00", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, borderBottom: "1 solid #f0f0f0", paddingBottom: 3 },
  row:         { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: "1 solid #f5f5f5" },
  rowLabel:    { color: "#555", flex: 1 },
  rowValue:    { fontFamily: "Helvetica-Bold", color: "#111", textAlign: "right", flex: 1 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#111", padding: "8 10", marginTop: 6 },
  totalLabel:  { fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 10 },
  totalValue:  { fontFamily: "Helvetica-Bold", color: "#ff7a00", fontSize: 10 },
  note:        { fontSize: 7.5, color: "#888", marginTop: 10, lineHeight: 1.5 },
  footer:      { position: "absolute", bottom: 0, left: 0, right: 0, borderTop: "1 solid #e5e5e5", padding: "6 24", flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 7, color: "#aaa" },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(amount: number, currency: string): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

// ── PDF Document ──────────────────────────────────────────────────────────────
interface ReceiptData {
  jobNumber:        number | null;
  bookingId:        string;
  requestId:        string;
  customerName:     string | null;
  customerEmail:    string | null;
  pickupAddress:    string | null;
  dropoffAddress:   string | null;
  pickupAt:         string | null;
  vehicleCategory:  string | null;
  companyName:      string | null;
  chargeCurrency:   string;
  chargeCarHire:    number;
  chargeFuel:       number;
  chargeTotal:      number;
  issuedAt:         string;
  logoBase64:       string | null;
}

function ReceiptDocument({ d }: { d: ReceiptData }) {
  const cur = d.chargeCurrency;
  const ref = d.jobNumber ? `#${d.jobNumber}` : d.bookingId.slice(0, 8).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Orange top bar */}
        <View style={s.topBar} />

        {/* Header */}
        <View style={s.header}>
          {d.logoBase64 ? (
            <Image src={`data:image/png;base64,${d.logoBase64}`} style={s.logo} />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff7a00" }}>CAMEL GLOBAL</Text>
          )}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>BOOKING CONFIRMATION RECEIPT</Text>
            <Text style={s.headerDate}>Issued: {fmtDateShort(d.issuedAt)}</Text>
            <Text style={s.headerDate}>Ref: {ref}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Title */}
          <Text style={s.title}>Booking Confirmation Receipt</Text>
          <Text style={s.subtitle}>
            Thank you for your payment. Your booking is confirmed.
          </Text>

          {/* Booking details */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Booking Details</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>Booking reference</Text>
              <Text style={s.rowValue}>{ref}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Customer name</Text>
              <Text style={s.rowValue}>{d.customerName || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Car hire company</Text>
              <Text style={s.rowValue}>{d.companyName || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Vehicle type</Text>
              <Text style={s.rowValue}>{d.vehicleCategory || "—"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Pickup address</Text>
              <Text style={s.rowValue}>{d.pickupAddress || "—"}</Text>
            </View>
            {d.dropoffAddress ? (
              <View style={s.row}>
                <Text style={s.rowLabel}>Drop-off address</Text>
                <Text style={s.rowValue}>{d.dropoffAddress}</Text>
              </View>
            ) : null}
            <View style={s.row}>
              <Text style={s.rowLabel}>Pickup date &amp; time</Text>
              <Text style={s.rowValue}>{fmtDate(d.pickupAt)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View style={s.section}>
            <Text style={s.sectionHead}>Payment Summary ({cur})</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>Car hire</Text>
              <Text style={s.rowValue}>{fmtMoney(d.chargeCarHire, cur)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.rowLabel}>Full tank deposit (refundable)</Text>
              <Text style={s.rowValue}>{fmtMoney(d.chargeFuel, cur)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total paid</Text>
              <Text style={s.totalValue}>{fmtMoney(d.chargeTotal, cur)}</Text>
            </View>
          </View>

          {/* Notes */}
          <Text style={s.note}>
            The fuel deposit will be refunded at the end of your hire based on the fuel level recorded at collection
            and return. Any unused fuel will be refunded to your original payment method within 5–10 business days
            of booking completion.
          </Text>
          <Text style={[s.note, { color: "#ff7a00", fontFamily: "Helvetica-Bold" }]}>
            Important: Please bring your driving licence for yourself and any additional driver.
          </Text>
          <Text style={s.note}>
            To view your booking, visit camel-global.com/bookings/{d.requestId}
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Camel Global · NTUK Ltd · Office 7, 35-37 Ludgate Hill, London EC4M 7JN · Company No. 08765474</Text>
          <Text style={s.footerText}>camel-global.com</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface GenerateBookingReceiptParams {
  jobNumber:        number | null;
  bookingId:        string;
  requestId:        string;
  customerName:     string | null;
  customerEmail:    string | null;
  pickupAddress:    string | null;
  dropoffAddress:   string | null;
  pickupAt:         string | null;
  vehicleCategory:  string | null;
  companyName:      string | null;
  chargeCurrency:   string;
  chargeCarHire:    number;
  chargeFuel:       number;
  chargeTotal:      number;
}

export async function generateBookingReceiptPDF(params: GenerateBookingReceiptParams): Promise<{
  storagePath: string;
  base64: string;
}> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const issuedAt = new Date().toISOString();
  const ref = params.jobNumber ? params.jobNumber : params.bookingId.slice(0, 8).toUpperCase();

  // Load logo
  let logoBase64: string | null = null;
  try {
    const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://camel-global.com"}/camel-invoice-logo.png`;
    const logoRes = await fetch(logoUrl);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      logoBase64 = Buffer.from(buf).toString("base64");
    }
  } catch (e) {
    console.warn("generateBookingReceiptPDF: logo fetch failed", e);
  }

  const data: ReceiptData = { ...params, issuedAt, logoBase64 };

  // Render PDF
  const pdfBuffer = await renderToBuffer(<ReceiptDocument d={data} />);
  const base64 = pdfBuffer.toString("base64");

  // Upload to Supabase Storage
  const storagePath = `${params.requestId}/booking-receipt-${ref}.pdf`;
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    console.error("generateBookingReceiptPDF: storage upload failed", uploadErr);
    // Don't throw — still return base64 so email can be sent
  }

  // Store path on booking record
  await db
    .from("partner_bookings")
    .update({ receipt_storage_path: storagePath })
    .eq("id", params.bookingId);

  return { storagePath, base64 };
}

// ── Send receipt email ────────────────────────────────────────────────────────
export async function sendBookingReceiptEmail(params: GenerateBookingReceiptParams): Promise<void> {
  const { base64 } = await generateBookingReceiptPDF(params);

  if (!params.customerEmail) {
    console.warn("sendBookingReceiptEmail: no customer email, skipping");
    return;
  }

  const jobNo = params.jobNumber ? `#${params.jobNumber}` : "";
  const cur = params.chargeCurrency;
  const fmtCharge = (n: number) =>
    new Intl.NumberFormat(cur === "GBP" ? "en-GB" : cur === "USD" ? "en-US" : "es-ES", {
      style: "currency", currency: cur,
    }).format(n);

  await sendEmail({
    to: params.customerEmail,
    subject: `Booking Confirmation Receipt ${jobNo} — Camel Global`,
    html: `
      <div style="font-family:system-ui,sans-serif;color:#222;max-width:600px;">
        <div style="background:#000;padding:20px 28px;">
          <h2 style="color:#fff;margin:0;">Booking Confirmation Receipt</h2>
          <p style="color:#999;margin:4px 0 0;font-size:13px;">Booking ${jobNo}</p>
        </div>
        <div style="padding:24px 28px;background:#fff;border:1px solid #eee;">
          <p>Hi ${params.customerName || "there"},</p>
          <p>Please find your booking confirmation receipt attached. Your booking with <strong>${params.companyName || "your car hire partner"}</strong> is confirmed.</p>
          <div style="background:#f8f8f8;padding:16px;margin:16px 0;border-left:4px solid #ff7a00;">
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#666;">Booking reference</td><td style="text-align:right;font-weight:700;">${jobNo}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Car hire</td><td style="text-align:right;">${fmtCharge(params.chargeCarHire)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Fuel deposit</td><td style="text-align:right;">${fmtCharge(params.chargeFuel)}</td></tr>
              <tr style="border-top:1px solid #ddd;">
                <td style="padding:8px 0 4px;font-weight:700;">Total paid</td>
                <td style="text-align:right;font-weight:700;">${fmtCharge(params.chargeTotal)}</td>
              </tr>
            </table>
          </div>
          <p style="font-size:13px;color:#666;">Your receipt is attached as a PDF. You can also download it any time from your booking page.</p>
          <p style="margin-top:24px;color:#999;font-size:13px;">The Camel Global Team</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Camel-Receipt-${params.jobNumber ?? params.bookingId.slice(0, 8)}.pdf`,
        content: base64,
        encoding: "base64",
      },
    ],
  });
}