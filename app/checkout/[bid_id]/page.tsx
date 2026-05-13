"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createCustomerBrowserClient } from "@/lib/supabase-customer/browser";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type IntentData = {
  client_secret:     string;
  payment_intent_id: string;
  amount_total:      number;
  amount_car_hire:   number;
  amount_fuel:       number;
  commission:        number;
  currency:          string;
  partner_name:      string;
};

const LOCALE_MAP: Record<string, string> = { EUR: "es-ES", GBP: "en-GB", USD: "en-US" };
function fmtCurr(amount: number, currency: string) {
  const curr = currency.toUpperCase();
  const locale = LOCALE_MAP[curr] || "en-GB";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(amount);
}

// ── Inner payment form (needs Stripe context) ──────────────────────────────────
function CheckoutForm({ intent, requestId, onError }: {
  intent: IntentData;
  requestId: string;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const router   = useRouter();
  const [paying,  setPaying]  = useState(false);
  const [formErr, setFormErr] = useState("");

  const curr = intent.currency.toUpperCase();

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true); setFormErr(""); onError("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${requestId}?payment=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message || "Payment failed. Please try again.";
      setFormErr(msg); onError(msg); setPaying(false);
      return;
    }

    // Payment succeeded without redirect
    router.push(`/bookings/${requestId}?payment=success`);
  }

  return (
    <div className="space-y-6">
      {/* Order summary */}
      <div className="bg-[#f0f0f0] p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-black">Order Summary</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-black/60">Car hire — {intent.partner_name}</span>
            <span className="font-black text-black">{fmtCurr(intent.amount_car_hire, curr)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold text-black/60">Full tank deposit <span className="text-black/40">(refundable)</span></span>
            <span className="font-black text-black">{fmtCurr(intent.amount_fuel, curr)}</span>
          </div>
          <div className="flex justify-between text-sm font-black border-t border-black/10 pt-2">
            <span className="text-black">Total</span>
            <span className="text-black text-lg">{fmtCurr(intent.amount_total, curr)}</span>
          </div>
        </div>
        <div className="border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black/50">
          💧 The fuel deposit will be refunded automatically when your booking completes, minus any fuel used.
        </div>
      </div>

      {/* Stripe payment form */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Payment Details</p>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {formErr && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {formErr}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || !elements || paying}
        className="w-full bg-[#ff7a00] py-4 text-base font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {paying ? "Processing payment…" : `Pay ${fmtCurr(intent.amount_total, curr)}`}
      </button>

      <p className="text-xs font-bold text-black/40 text-center">
        🔒 Payments are processed securely by Stripe. Camel Global never stores your card details.
      </p>
    </div>
  );
}

// ── Main checkout page ─────────────────────────────────────────────────────────
export default function CheckoutPage({ params }: { params: Promise<{ bid_id: string }> }) {
  const router   = useRouter();
  const supabase = useMemo(() => createCustomerBrowserClient(), []);

  const [bidId,     setBidId]     = useState("");
  const [requestId, setRequestId] = useState("");
  const [intent,    setIntent]    = useState<IntentData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => { params.then(p => setBidId(p.bid_id)); }, [params]);

  useEffect(() => {
    if (!bidId) return;

    async function init() {
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace(`/login?next=/checkout/${bidId}`);
        return;
      }

      // Load bid to get request_id for redirect
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bid_id: bidId }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Failed to initialise payment.");
        setLoading(false);
        return;
      }

      // Get request_id from bid — need it for redirect URL
      const bidRes = await fetch(`/api/test-booking/requests?bid_id=${bidId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // Fallback: extract from metadata after payment via URL param
      // Store request_id in sessionStorage so we can redirect correctly
      sessionStorage.setItem("checkout_bid_id",    bidId);
      sessionStorage.setItem("checkout_partner",   json.partner_name);

      setIntent(json);
      setRequestId(""); // will be set from payment success redirect
      setLoading(false);
    }

    init();
  }, [bidId, supabase, router]);

  // Get request_id separately for the redirect
  useEffect(() => {
    if (!bidId) return;
    // We need the request_id to build the success redirect URL
    // Load it from the booking detail page URL (stored in referrer or sessionStorage)
    const stored = sessionStorage.getItem(`request_for_bid_${bidId}`);
    if (stored) setRequestId(stored);
  }, [bidId]);

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="w-full bg-black px-4 py-2.5 flex items-center">
        <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
      </nav>
      <div className="flex-1 flex items-center justify-center bg-[#f0f0f0]">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-4 border-[#ff7a00] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-black text-black">Setting up secure payment…</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="w-full bg-black px-4 py-2.5 flex items-center">
        <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
      </nav>
      <div className="flex-1 flex items-center justify-center bg-[#f0f0f0] px-6">
        <div className="max-w-md w-full bg-white p-8 space-y-4">
          <p className="text-lg font-black text-red-700">Payment unavailable</p>
          <p className="text-sm font-bold text-black/60">{error}</p>
          <button onClick={() => router.back()}
            className="w-full border border-black/20 py-3 text-sm font-black text-black hover:bg-black/5">
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );

  if (!intent) return null;

  const curr = intent.currency.toUpperCase();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="w-full bg-black px-4 py-2.5 flex items-center justify-between">
        <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
        <Link href="/bookings" className="text-sm font-black text-white/60 hover:text-white">My Bookings</Link>
      </nav>

      {/* Hero */}
      <div className="w-full bg-black px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Secure Checkout</p>
          <h1 className="text-3xl font-black">Complete your booking</h1>
          <p className="mt-2 text-sm font-bold text-white/60">
            {intent.partner_name} · {fmtCurr(intent.amount_total, curr)}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-[#f0f0f0] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white p-8">
            {error && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 mb-6">
                {error}
              </div>
            )}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: intent.client_secret,
                appearance: {
                  theme: "flat",
                  variables: {
                    colorPrimary:    "#ff7a00",
                    colorBackground: "#f0f0f0",
                    fontFamily:      "system-ui, sans-serif",
                    borderRadius:    "0px",
                  },
                },
              }}
            >
              <CheckoutForm
                intent={intent}
                requestId={requestId}
                onError={setError}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}