"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

export type CookieConsent = "accepted" | "rejected" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
    // Fire GA if it loaded but was waiting
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 z-[9999] w-full border-t border-white/10 bg-[#003768] px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.25)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex-1 text-sm text-white/90 leading-relaxed">
          We use cookies to improve your experience and analyse site usage.{" "}
          <Link
            href="/cookies"
            className="underline underline-offset-2 hover:text-white"
          >
            Cookie Policy
          </Link>{" "}
          &amp;{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-white"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={reject}
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Reject Non-Essential
          </button>
          <button
            onClick={accept}
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-xs font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}