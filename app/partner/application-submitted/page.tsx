"use client";

import Image from "next/image";
import Link from "next/link";

export default function PartnerApplicationSubmittedPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          <Link href="/partner/application-submitted" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global logo"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>

          <Link
            href="/partner/login"
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Login
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-7xl items-start justify-center px-4 pb-10 pt-32">
        <div className="w-full max-w-2xl rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:p-12">
          <h1 className="text-3xl font-semibold text-[#003768] md:text-4xl">
            Thank you for your application
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Your partner application has been received successfully.
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            You will hear from us by email in the next 48 hours.
          </p>

          <div className="mt-10">
            <Link
              href="/partner/login"
              className="inline-flex rounded-full bg-[#ff7a00] px-8 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}