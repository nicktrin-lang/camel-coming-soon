"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TERMS_VERSION = "2026-04";
const TERMS_EFFECTIVE = "1 April 2026";

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string; house_number?: string; suburb?: string; city?: string;
    town?: string; village?: string; state?: string; postcode?: string;
    country?: string;
  };
};

const COUNTRIES = [
  "Spain", "United Kingdom", "Gibraltar", "Ireland", "Portugal",
  "France", "Italy", "Germany", "Netherlands", "Belgium",
  "United States", "Canada", "Australia", "Other",
];

function parseSuggestion(s: Suggestion) {
  const a = s.address ?? {};
  const road = [a.house_number, a.road].filter(Boolean).join(" ");
  const area = a.suburb || a.city || a.town || a.village || "";
  return {
    address1: road || s.display_name.split(",")[0] || "",
    address2: area,
    province: a.state || "",
    postcode: a.postcode || "",
    country: a.country || "",
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lon),
    display: s.display_name,
  };
}

// ── Inline T&Cs PDF download (no navigation) ─────────────────────────────────

function downloadTermsPDF() {
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const sections = [
    { title: "1. Definitions", clauses: [
      '"Agreement" means these Partner Terms and Conditions together with the Partner Operating Rules, which are incorporated by reference and form part of this Agreement.',
      '"Camel Global", "we", "us" or "our" means Camel Global Ltd, a company registered in England and Wales.',
      '"Partner", "you" or "your" means the independent car hire business that has registered on the Platform and accepted this Agreement.',
      '"Platform" means the Camel Global web-based marketplace, portals, APIs, and associated services available at camel-global.com.',
      '"Customer" means any end user who submits a car hire request via the Platform.',
      '"Booking" means a confirmed hire arrangement between a Customer and a Partner facilitated through the Platform.',
      '"Commission" means the fee charged by Camel Global to the Partner for use of the Platform, as set out in clause 7.',
      '"Hire Price" means the price bid and accepted for the car hire element of a Booking, excluding any fuel charge.',
      '"Fuel Charge" means the amount charged to a Customer for fuel consumed during a Booking, calculated in accordance with the Partner Operating Rules.',
      '"Partner Operating Rules" means the operational standards and conduct requirements published in the Partner account management section, as updated from time to time.',
      '"Services" means the marketplace facilitation, booking management, payment processing, and related services provided by Camel Global via the Platform.',
    ]},
    { title: "2. Nature of the Relationship — Camel as Intermediary", clauses: [
      "Camel Global operates as a marketplace intermediary and technology platform. Camel Global is not a car hire operator, does not own or operate any vehicles, and does not employ any drivers.",
      "The legal contract for the provision of car hire services is formed directly between the Partner and the Customer. Camel Global is not a party to that contract and accepts no liability for its performance.",
      "Camel Global does not act as agent for either party in the conclusion of a Booking. The Partner is the supplier of services and issues all relevant documentation, including VAT invoices, directly to Customers.",
      "The Partner acknowledges that Camel Global's role is limited to: (a) operating the Platform; (b) facilitating the introduction of Customers to Partners; (c) processing payments on behalf of Partners as a disclosed intermediary; and (d) providing the tools described in the Partner Operating Rules.",
      "Nothing in this Agreement creates an employment relationship, agency, partnership, joint venture, or franchise between Camel Global and the Partner or any of the Partner's drivers or employees.",
      "The Partner must not represent to any Customer or third party that Camel Global is the supplier of car hire services, or that drivers are employed by or agents of Camel Global.",
    ]},
    { title: "3. Registration and Account", clauses: [
      "To use the Platform, the Partner must complete the registration process, provide accurate and complete information, and receive approval from Camel Global.",
      "The Partner warrants that all information provided during registration and at any point thereafter is true, accurate, current, and complete.",
      "The Partner is responsible for maintaining the confidentiality of their account credentials and for all activity that occurs under their account.",
      "The Partner must notify Camel Global immediately of any unauthorised use of their account or any other breach of security.",
      "Camel Global reserves the right to refuse registration or to suspend or terminate an account at any time in accordance with clause 11.",
      "Each partner account is for a single legal entity. The Partner must not create multiple accounts or allow third parties to use their account.",
      "The Partner must keep their registered details, including legal company name, VAT/NIF number, and contact information, up to date at all times.",
    ]},
    { title: "4. Partner Obligations", clauses: [
      "The Partner must comply with the Partner Operating Rules at all times. The Operating Rules are incorporated into this Agreement and have the same legal force.",
      "The Partner must hold and maintain all licences, permits, registrations, and insurance policies required by applicable law to operate a car hire business in their jurisdiction.",
      "The Partner must ensure that all vehicles offered through the Platform are roadworthy, legally registered, fully insured, and meet the standards set out in the Operating Rules.",
      "The Partner is solely responsible for the conduct of all drivers registered under their account and for ensuring those drivers meet the standards set out in the Operating Rules.",
      "The Partner must fulfil every Booking they accept. Failure to fulfil a confirmed Booking without exceptional justification is a material breach of this Agreement.",
      "The Partner must not use the Platform to offer services they are unable to deliver, submit bids on requests they cannot fulfil, or engage in any practice that misleads Customers.",
      "The Partner must respond to Customer enquiries and complaints within the timeframes set out in the Operating Rules.",
      "The Partner must accurately record all fuel levels using the Camel Global driver app at every delivery and collection, in accordance with the fuel policy in the Operating Rules.",
    ]},
    { title: "5. Camel Global Obligations", clauses: [
      "Camel Global will use reasonable endeavours to make the Platform available 24 hours a day, 7 days a week, subject to planned maintenance and events outside our control.",
      "Camel Global will process Bookings, payments, and notifications in accordance with the functionality described in the Platform.",
      "Camel Global will notify Partners of new customer requests within their service radius in a timely manner.",
      "Camel Global will provide Partner support via support@camel-global.com and will use reasonable endeavours to respond to enquiries within 2 business days.",
      "Camel Global will give Partners at least 14 days' written notice of any material changes to these Terms or the Operating Rules, except where immediate changes are required by law or to protect the safety of the Platform.",
      "Camel Global does not guarantee any minimum volume of Bookings or revenue to any Partner.",
    ]},
    { title: "6. Bookings and Pricing", clauses: [
      "Partners may bid on any customer request that falls within their registered service radius.",
      "All prices submitted by Partners must be fully inclusive of all costs associated with delivering, insuring, and collecting the vehicle. No additional charges may be added to the Customer after a bid is accepted.",
      "The Partner is bound by the price they bid once a Booking is confirmed. Camel Global will not adjust or renegotiate bid prices after confirmation.",
      "Partners may submit only one bid per customer request. Bids submitted after the bid window has closed will not be accepted.",
      "The Partner acknowledges that Customers have no obligation to accept any bid, and that Camel Global has no obligation to present any bid to a Customer.",
      "Camel Global reserves the right to remove or decline to display bids that appear to be inaccurate, incomplete, or in breach of these Terms.",
    ]},
    { title: "7. Commission and Payments", clauses: [
      "Camel Global charges a commission on the Hire Price of each completed Booking. The default commission rate is 20% of the Hire Price, subject to a minimum commission of €10 (or currency equivalent) per Booking.",
      "Fuel Charges are passed through to the Partner in full. Camel Global does not charge commission on Fuel Charges.",
      "The Partner's payout for each Booking is calculated as: (Hire Price minus Commission) plus Fuel Charge.",
      "Commission rates may be adjusted for individual Partners by agreement with Camel Global. Any per-Partner rate override will be reflected in the Partner's account and in all reporting.",
      "Payments will be processed via Stripe Connect. The Partner must complete Stripe Express onboarding to receive payouts. Camel Global is not responsible for delays caused by Stripe or by the Partner's failure to complete onboarding.",
      "Camel Global will deduct commission automatically at the point of payment. Partners receive their net payout directly to their Stripe account.",
      "Camel Global will issue commission invoices to Partners on a monthly basis. Invoices will state the reverse charge treatment under Article 44/196 of the EU VAT Directive where applicable.",
      "The Partner is solely responsible for accounting for and paying all taxes on income received through the Platform, including VAT, income tax, and any other applicable taxes in their jurisdiction.",
      "In the event of a Customer refund dispute, Camel Global may mediate but the financial liability for any refund rests with the Partner. Camel Global reserves the right to withhold or claw back amounts from future payouts where a refund has been issued.",
      "All fuel refunds owed to Customers must be processed within 5 business days of Booking completion. Failure to do so may result in Camel Global processing the refund and recovering the amount from the Partner.",
    ]},
    { title: "8. VAT and Tax", clauses: [
      "The Partner is responsible for charging and accounting for VAT on the full Booking price paid by the Customer.",
      "Camel Global will invoice the Partner for commission using the reverse charge mechanism under Article 44/196 of the EU VAT Directive. No UK or Spanish VAT will be added to Camel Global's commission invoices where reverse charge applies.",
      "Partners operating in Spain must provide a valid NIF (e.g. B12345678, represented as ESB12345678 for EU transactions). This is required for account activation and commission invoicing.",
      "It is the Partner's responsibility to seek independent tax advice regarding their obligations. Camel Global does not provide tax advice.",
    ]},
    { title: "9. Insurance", clauses: [
      "The Partner is solely responsible for ensuring that all vehicles operated through the Platform are comprehensively insured at all times.",
      "The Partner must maintain public liability insurance with a minimum coverage of €5,000,000.",
      "Where a bid states 'Full Insurance Included', this must represent genuine comprehensive insurance and not merely a damage waiver or excess reduction product.",
      "The Partner indemnifies Camel Global against all claims, losses, damages, costs, and expenses arising from any accident, incident, or liability involving the Partner's vehicles or drivers.",
      "Camel Global is not liable for any loss, damage, injury, or death caused by a Partner's vehicle, driver, or operations.",
      "The Partner must report any accident, theft, or significant incident involving a Camel Global Booking to Camel Global within 24 hours.",
    ]},
    { title: "10. Intellectual Property", clauses: [
      "Camel Global retains all intellectual property rights in the Platform, including all software, designs, trademarks, and content.",
      "The Partner is granted a limited, non-exclusive, non-transferable licence to use the Platform solely for the purpose of fulfilling Bookings in accordance with this Agreement.",
      "The Partner must not copy, reverse engineer, modify, or create derivative works from any part of the Platform.",
      "The Partner grants Camel Global a non-exclusive licence to use the Partner's company name, logo, and profile information for the purpose of displaying the Partner's profile to Customers on the Platform.",
    ]},
    { title: "11. Data Protection and GDPR", clauses: [
      "Each party shall comply with all applicable data protection legislation, including the UK GDPR, EU GDPR, and any applicable local data protection laws.",
      "Customer personal data shared via the Platform may only be processed by the Partner for the purpose of fulfilling the specific Booking for which it was shared.",
      "The Partner must not use Customer data for any secondary purpose including marketing, profiling, re-targeting, or sale to third parties.",
      "The Partner must implement appropriate technical and organisational measures to protect Customer data against unauthorised access, loss, or disclosure.",
      "Upon request, the Partner must delete all personal data relating to a Customer within 30 days.",
      "The Partner must notify Camel Global of any personal data breach involving Customer data within 72 hours of becoming aware of it.",
    ]},
    { title: "12. Liability", clauses: [
      "Nothing in this Agreement limits or excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.",
      "Subject to clause 12.1, Camel Global's total aggregate liability to the Partner shall not exceed the total commission paid by the Partner to Camel Global in the 3 months immediately preceding the event giving rise to the claim.",
      "Camel Global shall not be liable for any indirect, consequential, special, or punitive loss or damage, including loss of profit, loss of revenue, loss of business, or loss of data.",
      "Camel Global shall not be liable for any loss or damage arising from the Partner's failure to comply with these Terms, the actions of the Partner's drivers or employees, or any failure of third-party services including Stripe or Google Maps.",
    ]},
    { title: "13. Suspension and Termination", clauses: [
      "Camel Global may suspend a Partner account immediately and without notice in the event of a serious customer complaint, breach of vehicle or driver standards, failure to fulfil a confirmed Booking, or misrepresentation of pricing or services.",
      "Following suspension, the Partner will be notified by email and given the opportunity to respond within 5 business days.",
      "Camel Global may permanently terminate this Agreement for repeated breaches, a single serious violation, or where the Partner is subject to insolvency proceedings.",
      "The Partner may terminate this Agreement at any time by providing 30 days' written notice to support@camel-global.com, provided no active Bookings remain outstanding.",
      "On termination, the Partner's access to the Platform will be revoked, all outstanding amounts become immediately payable, and the Partner must delete all Customer personal data within 30 days.",
    ]},
    { title: "14. Amendments", clauses: [
      "Camel Global reserves the right to amend these Terms and the Partner Operating Rules at any time.",
      "Partners will be notified of any material changes by email with a minimum of 14 days' notice.",
      "Continued use of the Platform after the notice period constitutes acceptance of the updated Terms.",
      "The current version of these Terms is always available at camel-global.com/partner/terms.",
    ]},
    { title: "15. General", clauses: [
      "This Agreement constitutes the entire agreement between the parties in relation to its subject matter.",
      "If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.",
      "The Partner may not assign or transfer any rights or obligations under this Agreement without the prior written consent of Camel Global.",
      "This Agreement is governed by the laws of England and Wales. Each party irrevocably submits to the exclusive jurisdiction of the courts of England and Wales.",
    ]},
  ];

  const sectionsHtml = sections.map(({ title, clauses }) => `
    <div style="margin-bottom:24px;">
      <h3 style="color:#003768;font-size:14px;font-weight:700;margin:0 0 8px 0;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">${title}</h3>
      <ol style="margin:0;padding-left:20px;">
        ${clauses.map(c => `<li style="font-size:11px;color:#334155;margin-bottom:5px;line-height:1.6;">${c}</li>`).join("")}
      </ol>
    </div>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>Camel Global — Partner Terms and Conditions</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; padding:40px; color:#1e293b; background:#fff; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #003768; padding-bottom:16px; margin-bottom:24px; }
    .logo { font-size:22px; font-weight:900; color:#003768; letter-spacing:-1px; }
    .logo span { color:#ff7a00; }
    .meta { text-align:right; font-size:11px; color:#64748b; }
    h1 { font-size:20px; color:#003768; font-weight:800; margin-bottom:4px; }
    h2 { font-size:12px; color:#64748b; font-weight:400; margin-bottom:16px; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; text-align:center; }
  </style>
  </head><body>
  <div class="header">
    <div><div class="logo">🐪 Camel <span>Global</span></div><div style="font-size:11px;color:#64748b;margin-top:4px;">Meet and greet car hire</div></div>
    <div class="meta"><div><strong>Partner Terms and Conditions</strong></div><div>Version: ${TERMS_VERSION} — Effective: ${TERMS_EFFECTIVE}</div><div>Generated: ${dateStr}</div></div>
  </div>
  <h1>Partner Terms and Conditions</h1>
  <h2>These Terms govern your use of the Camel Global platform as a partner. By registering as a partner you agree to be bound by these Terms in full.</h2>
  ${sectionsHtml}
  <div class="footer">Camel Global Partner Terms and Conditions — Version ${TERMS_VERSION} — Effective ${TERMS_EFFECTIVE} — camelglobal.com</div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 500);
    };
  }
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

const STEP_LABELS = ["Your Business", "Business Address", "Fleet Address", "Password", "Review"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center">
        {STEP_LABELS.map((label, i) => {
          const done = i + 1 < step;
          const active = i + 1 === step;
          return (
            <div key={label} className={`flex items-center ${i < STEP_LABELS.length - 1 ? "flex-1" : ""}`}>
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                  done ? "bg-green-500 text-white" : active ? "bg-[#ff7a00] text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  active ? "text-[#ff7a00]" : done ? "text-green-600" : "text-slate-400"
                }`}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-1 flex-1 mx-2 mb-5 rounded transition-colors ${done ? "bg-green-500" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#003768] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0f4f8a] focus:ring-2 focus:ring-[#0f4f8a]/10 ${className}`}
      {...props}
    />
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3 text-sm text-[#003768]">
      {children}
    </div>
  );
}

function AddressSearch({ onSelect, placeholder }: {
  onSelect: (r: ReturnType<typeof parseSuggestion>) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  function search(q: string) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim() || q.length < 3) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setSuggestions(data); setOpen(true);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }

  function select(s: Suggestion) {
    const parsed = parseSuggestion(s);
    setQuery(parsed.display);
    setSuggestions([]); setOpen(false);
    onSelect(parsed);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input value={query} onChange={e => search(e.target.value)}
          placeholder={placeholder ?? "Search for your address..."}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f4f8a] border-t-transparent" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <button key={i} type="button"
              className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl border-b border-black/5 last:border-0"
              onMouseDown={() => select(s)}>
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type FormData = {
  companyName: string; contactName: string; email: string;
  phone: string; website: string;
  address1: string; address2: string; city: string;
  province: string; postcode: string; country: string;
  addressLat: number | null; addressLng: number | null;
  fleetAddress1: string; fleetAddress2: string; fleetCity: string;
  fleetProvince: string; fleetPostcode: string; fleetCountry: string;
  fleetLat: number | null; fleetLng: number | null;
  password: string; confirmPassword: string;
  agreedToTerms: boolean;
};

const EMPTY: FormData = {
  companyName: "", contactName: "", email: "", phone: "", website: "",
  address1: "", address2: "", city: "", province: "", postcode: "", country: "Spain",
  addressLat: null, addressLng: null,
  fleetAddress1: "", fleetAddress2: "", fleetCity: "", fleetProvince: "",
  fleetPostcode: "", fleetCountry: "Spain", fleetLat: null, fleetLng: null,
  password: "", confirmPassword: "", agreedToTerms: false,
};

// Step 1 — Business Details
function Step1({ data, onChange, onNext, error }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void; error: string;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.companyName.trim()) e.companyName = "Company name is required";
    if (!data.contactName.trim()) e.contactName = "Contact name is required";
    if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = "Valid email is required";
    if (!data.phone.trim()) e.phone = "Phone number is required";
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Your Business</h2>
        <p className="mt-1 text-slate-500">Tell us about your car hire company.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required error={errors.companyName}>
          <Input value={data.companyName} onChange={e => onChange("companyName", e.target.value)} placeholder="Valencia Cars S.L." />
        </Field>
        <Field label="Contact name" required error={errors.contactName}>
          <Input value={data.contactName} onChange={e => onChange("contactName", e.target.value)} placeholder="Juan Garcia" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email address" required error={errors.email}>
          <Input type="email" value={data.email} onChange={e => onChange("email", e.target.value)} placeholder="info@valenciacars.com" autoComplete="email" />
        </Field>
        <Field label="Phone number" required error={errors.phone}>
          <Input type="tel" value={data.phone} onChange={e => onChange("phone", e.target.value)} placeholder="+34 600 000 000" autoComplete="tel" />
        </Field>
      </div>
      <Field label="Website">
        <Input type="url" value={data.website} onChange={e => onChange("website", e.target.value)} placeholder="https://valenciacars.com" />
      </Field>
      <button type="button" onClick={() => validate() && onNext()}
        className="w-full rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
        Continue to Business Address
      </button>
    </div>
  );
}

// Step 2 — Business Address
function Step2({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string | number | null) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [searchDone, setSearchDone] = useState(false);
  function handleSelect(r: ReturnType<typeof parseSuggestion>) {
    onChange("address1", r.address1); onChange("address2", r.address2);
    onChange("city", r.address2 || ""); onChange("province", r.province);
    onChange("postcode", r.postcode); onChange("country", r.country || "Spain");
    onChange("addressLat", r.lat); onChange("addressLng", r.lng);
    setSearchDone(true);
  }
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.address1.trim()) e.address1 = "Address line 1 is required";
    if (!data.province.trim()) e.province = "Province is required";
    if (!data.postcode.trim()) e.postcode = "Postcode is required";
    if (!data.country.trim()) e.country = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Business Address</h2>
        <p className="mt-1 text-slate-500">Your registered company address for correspondence and records.</p>
      </div>
      <InfoBox>
        <p className="font-semibold mb-1">Search your address</p>
        <AddressSearch onSelect={handleSelect} placeholder="e.g. Calle Mayor 12, Valencia..." />
        {searchDone && <p className="mt-2 text-xs text-green-700 font-medium">Address found — check fields below and correct if needed</p>}
      </InfoBox>
      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.address1}>
          <Input value={data.address1} onChange={e => onChange("address1", e.target.value)} placeholder="Street name and number" />
        </Field>
        <Field label="Address line 2">
          <Input value={data.address2} onChange={e => onChange("address2", e.target.value)} placeholder="Apartment, unit, floor (optional)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town">
            <Input value={data.city} onChange={e => onChange("city", e.target.value)} placeholder="Valencia" />
          </Field>
          <Field label="Province / Region" required error={errors.province}>
            <Input value={data.province} onChange={e => onChange("province", e.target.value)} placeholder="Comunitat Valenciana" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode" required error={errors.postcode}>
            <Input value={data.postcode} onChange={e => onChange("postcode", e.target.value)} placeholder="46001" />
          </Field>
          <Field label="Country" required error={errors.country}>
            <select value={data.country} onChange={e => onChange("country", e.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none focus:border-[#0f4f8a]">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Continue to Fleet Address
        </button>
      </div>
    </div>
  );
}

// Step 3 — Fleet Base Address
function Step3({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string | number | null | boolean) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [searchDone, setSearchDone] = useState(false);
  const [sameAsBusiness, setSameAsBusiness] = useState(false);
  function handleSameAsBusiness(checked: boolean) {
    setSameAsBusiness(checked);
    if (checked) {
      onChange("fleetAddress1", data.address1); onChange("fleetAddress2", data.address2);
      onChange("fleetCity", data.city); onChange("fleetProvince", data.province);
      onChange("fleetPostcode", data.postcode); onChange("fleetCountry", data.country);
      onChange("fleetLat", data.addressLat); onChange("fleetLng", data.addressLng);
    }
  }
  function handleSelect(r: ReturnType<typeof parseSuggestion>) {
    onChange("fleetAddress1", r.address1); onChange("fleetAddress2", r.address2);
    onChange("fleetCity", r.address2 || ""); onChange("fleetProvince", r.province);
    onChange("fleetPostcode", r.postcode); onChange("fleetCountry", r.country || "Spain");
    onChange("fleetLat", r.lat); onChange("fleetLng", r.lng);
    setSearchDone(true);
  }
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.fleetAddress1.trim()) e.fleetAddress1 = "Address line 1 is required";
    if (!data.fleetCountry.trim()) e.fleetCountry = "Country is required";
    setErrors(e); return Object.keys(e).length === 0;
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Fleet Base Address</h2>
        <p className="mt-1 text-slate-500">Where your vehicles are based and dispatched from. This is used to match you with nearby customers.</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-[#003768]/10 bg-[#f3f8ff] px-4 py-3">
        <input type="checkbox" checked={sameAsBusiness} onChange={e => handleSameAsBusiness(e.target.checked)} className="h-4 w-4 accent-[#003768]" />
        <div>
          <span className="text-sm font-semibold text-[#003768]">Same as business address</span>
          <p className="text-xs text-slate-500">Tick if your fleet is based at your registered business address</p>
        </div>
      </label>
      {!sameAsBusiness && (
        <InfoBox>
          <p className="font-semibold mb-1">Search your fleet address</p>
          <AddressSearch onSelect={handleSelect} placeholder="e.g. Cami del Coscollar, Manises..." />
          {searchDone && <p className="mt-2 text-xs text-green-700 font-medium">Address found — check fields below and correct if needed</p>}
        </InfoBox>
      )}
      <div className="space-y-4">
        <Field label="Address line 1" required error={errors.fleetAddress1}>
          <Input value={data.fleetAddress1} onChange={e => onChange("fleetAddress1", e.target.value)} placeholder="Street name and number" />
        </Field>
        <Field label="Address line 2">
          <Input value={data.fleetAddress2} onChange={e => onChange("fleetAddress2", e.target.value)} placeholder="Unit, depot, yard (optional)" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / Town">
            <Input value={data.fleetCity} onChange={e => onChange("fleetCity", e.target.value)} placeholder="Valencia" />
          </Field>
          <Field label="Province / Region">
            <Input value={data.fleetProvince} onChange={e => onChange("fleetProvince", e.target.value)} placeholder="Comunitat Valenciana" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Postcode">
            <Input value={data.fleetPostcode} onChange={e => onChange("fleetPostcode", e.target.value)} placeholder="46001" />
          </Field>
          <Field label="Country" required error={errors.fleetCountry}>
            <select value={data.fleetCountry} onChange={e => onChange("fleetCountry", e.target.value)}
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-slate-900 outline-none focus:border-[#0f4f8a]">
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Continue to Password
        </button>
      </div>
    </div>
  );
}

// Step 4 — Password
function Step4({ data, onChange, onNext, onBack }: {
  data: FormData; onChange: (k: keyof FormData, v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPw, setShowPw] = useState(false);
  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!data.password || data.password.length < 8) e.password = "Password must be at least 8 characters";
    if (data.password !== data.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e); return Object.keys(e).length === 0;
  }
  const strength = data.password.length === 0 ? 0 : data.password.length < 8 ? 1 : data.password.length < 12 ? 2 : 3;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Set Your Password</h2>
        <p className="mt-1 text-slate-500">Choose a strong password to secure your partner account.</p>
      </div>
      <Field label="Password" required error={errors.password}>
        <div className="relative">
          <Input type={showPw ? "text" : "password"} value={data.password}
            onChange={e => onChange("password", e.target.value)}
            placeholder="Minimum 8 characters" autoComplete="new-password" />
          <button type="button" onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-700">
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        {data.password.length > 0 && (
          <div className="mt-2 flex gap-1 items-center">
            {[1,2,3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= strength ? strength === 1 ? "bg-red-400" : strength === 2 ? "bg-yellow-400" : "bg-green-500" : "bg-slate-200"
              }`} />
            ))}
            <span className="text-xs ml-2 text-slate-500">
              {strength === 1 ? "Weak" : strength === 2 ? "Good" : "Strong"}
            </span>
          </div>
        )}
      </Field>
      <Field label="Confirm password" required error={errors.confirmPassword}>
        <Input type={showPw ? "text" : "password"} value={data.confirmPassword}
          onChange={e => onChange("confirmPassword", e.target.value)}
          placeholder="Repeat your password" autoComplete="new-password" />
        {data.confirmPassword && data.password === data.confirmPassword && (
          <p className="mt-1 text-xs text-green-600 font-medium">Passwords match</p>
        )}
      </Field>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={() => validate() && onNext()}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95">
          Review & Submit
        </button>
      </div>
    </div>
  );
}

// Step 5 — Review & Submit
function Step5({ data, onChange, onBack, onSubmit, submitting, error }: {
  data: FormData; onChange: (k: keyof FormData, v: boolean) => void;
  onBack: () => void; onSubmit: () => void; submitting: boolean; error: string;
}) {
  const bizAddress = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
  const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Company", data.companyName], ["Contact", data.contactName],
    ["Email", data.email], ["Phone", data.phone],
    ["Website", data.website || "—"],
    ["Business Address", bizAddress], ["Fleet Address", fleetAddress],
  ];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#003768]">Review Your Details</h2>
        <p className="mt-1 text-slate-500">Check everything looks correct before submitting.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="rounded-2xl border border-black/5 bg-slate-50 p-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-3 text-sm">
            <span className="w-32 shrink-0 font-semibold text-slate-500">{label}</span>
            <span className="text-slate-800">{value}</span>
          </div>
        ))}
      </div>
      <InfoBox>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.agreedToTerms}
            onChange={e => onChange("agreedToTerms", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#ff7a00]" />
          <span className="text-sm text-slate-700">
            I agree to the{" "}
            <button
              type="button"
              onClick={downloadTermsPDF}
              className="font-semibold text-[#003768] underline hover:opacity-75"
            >
              Camel Global Partner Terms & Conditions
            </button>
            {" "}and confirm all information is accurate.
          </span>
        </label>
      </InfoBox>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">What happens next?</p>
        <p className="mt-1">Your application will be reviewed by our team. You will receive an email confirmation shortly, and we will be in touch once your account has been approved.</p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-full border border-black/10 py-4 font-semibold text-[#003768] hover:bg-black/5">Back</button>
        <button type="button" onClick={onSubmit}
          disabled={!data.agreedToTerms || submitting}
          className="flex-[2] rounded-full bg-[#ff7a00] py-4 text-lg font-semibold text-white shadow-[0_10px_24px_rgba(255,122,0,0.3)] hover:opacity-95 disabled:opacity-50">
          {submitting ? "Submitting..." : "Create my account"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PartnerSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setField(k: keyof FormData, v: string | number | boolean | null) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setSubmitting(true); setError("");
    try {
      const fleetAddress = [data.fleetAddress1, data.fleetAddress2, data.fleetCity, data.fleetProvince, data.fleetPostcode, data.fleetCountry].filter(Boolean).join(", ");
      const bizAddress = [data.address1, data.address2, data.city, data.province, data.postcode, data.country].filter(Boolean).join(", ");
      const res = await fetch("/api/partner/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.companyName, contactName: data.contactName,
          email: data.email, phone: data.phone, website: data.website,
          password: data.password,
          address1: data.address1, address2: data.address2, city: data.city,
          province: data.province, postcode: data.postcode, country: data.country,
          addressLat: data.addressLat, addressLng: data.addressLng, address: bizAddress,
          baseAddress: fleetAddress, baseAddress1: data.fleetAddress1,
          baseAddress2: data.fleetAddress2, baseCity: data.fleetCity,
          baseProvince: data.fleetProvince, basePostcode: data.fleetPostcode,
          baseCountry: data.fleetCountry, baseLat: data.fleetLat, baseLng: data.fleetLng,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Something went wrong. Please try again.");
      router.replace("/partner/application-submitted");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 bg-[#0f4f8a] shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center px-6 md:px-12">
          <Link href="/partner/login">
            <Image src="/camel-logo.png" alt="Camel Global" width={160} height={54} priority className="h-[48px] w-auto" />
          </Link>
        </div>
      </header>
      <div className="pt-28 pb-16 px-6 md:px-12 lg:px-20">
        <div className="w-full">
          <div className="rounded-3xl border border-black/5 bg-white p-8 md:p-12 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <ProgressBar step={step} />
            {step === 1 && <Step1 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(2); }} error={error} />}
            {step === 2 && <Step2 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(3); }} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 data={data} onChange={(k, v) => setField(k, v)} onNext={() => { setError(""); setStep(4); }} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 data={data} onChange={(k, v) => setField(k, v as string)} onNext={() => { setError(""); setStep(5); }} onBack={() => setStep(3)} />}
            {step === 5 && <Step5 data={data} onChange={(k, v) => setField(k, v as boolean)} onBack={() => setStep(4)} onSubmit={submit} submitting={submitting} error={error} />}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/partner/login" className="font-semibold text-[#003768] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}