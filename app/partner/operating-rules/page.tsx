"use client";

import { useState } from "react";
import { OPERATING_RULES, downloadOperatingRulesPDF } from "@/lib/portal/operatingRules";

export default function PartnerOperatingRulesPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try { await downloadOperatingRulesPDF("Partner"); }
    finally { setDownloading(false); }
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0]">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Partner Operating Agreement</h1>
          <p className="mt-3 text-base font-semibold text-white/70">
            These rules govern your conduct as a Camel Global partner. By operating on the platform you agree to comply with all sections below.
          </p>
          <p className="mt-2 text-xs font-semibold text-white/40">Last updated April 2026 — subject to change with 14 days' notice.</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">

        {/* Download button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="bg-black px-5 py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {downloading ? "Generating…" : "⬇ Download PDF"}
          </button>
        </div>

        {/* Rules sections */}
        {OPERATING_RULES.map(({ section, rules }) => (
          <div key={section} className="bg-white p-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">
              {section}
            </h2>
            <ol className="space-y-3">
              {rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm font-semibold text-black/70 leading-relaxed">
                  <span className="shrink-0 font-black text-black w-5">{i + 1}.</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <p className="text-xs font-semibold text-black/30 text-center pb-4">
          Camel Global Partner Operating Agreement — Last updated April 2026 — Subject to change with 14 days&apos; notice.
        </p>
      </div>
    </div>
  );
}