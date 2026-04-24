"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

// ── Shared black footer base ──────────────────────────────────────────────────
function PortalFooterBase({ children }: { children: React.ReactNode }) {
  return (
    <footer className="w-full bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {children}
        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-white">© {year} Camel Global Ltd. All rights reserved.</p>
          <p className="text-sm font-bold text-white">Registered in England &amp; Wales</p>
        </div>
      </div>
    </footer>
  );
}

function PortalFooterLogo() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/">
        <Image src="/camel-logo.png" alt="Camel Global Ltd" width={160} height={58} className="h-16 w-auto brightness-0 invert" />
      </Link>
      <p className="max-w-[220px] text-sm font-bold text-white/60 leading-relaxed">
        Meet &amp; greet car hire, delivered to your door.
      </p>
    </div>
  );
}

// ── Partner footer ────────────────────────────────────────────────────────────
function PartnerFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <PortalFooterLogo />
        <div className="flex flex-wrap gap-12">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Company</p>
            <Link href="/about"   className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">About Us</Link>
            <Link href="/contact" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Legal</p>
            <Link href="/partner/terms"           className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Terms</Link>
            <Link href="/partner/operating-rules" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Operating Agreement</Link>
            <Link href="/privacy"                 className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Privacy Policy</Link>
            <Link href="/cookies"                 className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Cookie Policy</Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Platform</p>
            <Link href="/"               className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Customer Site</Link>
            <Link href="/partner/login"  className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Login</Link>
            <Link href="/partner/signup" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Become a Partner</Link>
          </div>
        </div>
      </div>
    </PortalFooterBase>
  );
}

// ── Admin footer ──────────────────────────────────────────────────────────────
function AdminFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <PortalFooterLogo />
        <div className="flex flex-wrap gap-12">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Company</p>
            <Link href="/about"   className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">About Us</Link>
            <Link href="/contact" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Legal</p>
            <Link href="/admin/terms"            className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Terms</Link>
            <Link href="/admin/operating-rules"  className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Operating Agreement</Link>
            <Link href="/privacy"                className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Privacy Policy</Link>
            <Link href="/cookies"                className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Cookie Policy</Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Platform</p>
            <Link href="/"              className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Customer Site</Link>
            <Link href="/partner/login" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">Partner Login</Link>
          </div>
        </div>
      </div>
    </PortalFooterBase>
  );
}

// ── Driver footer ─────────────────────────────────────────────────────────────
function DriverFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <PortalFooterLogo />
        <Link href="/driver/login" className="text-base font-bold text-white hover:text-[#ff7a00] transition-colors">
          Driver Login
        </Link>
      </div>
    </PortalFooterBase>
  );
}

// ── Customer footer ───────────────────────────────────────────────────────────
function CustomerFooter() {
  return (
    <footer className="w-full bg-black text-white">
      {/* Ready to book CTA */}
      <div className="border-b border-white/10 py-14">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to book?</h2>
          <p className="mt-2 text-base font-bold text-white/70">No account needed to start.</p>
          <Link href="/book"
            className="mt-6 inline-block bg-[#ff7a00] px-10 py-4 text-base font-black text-white hover:opacity-90 transition-opacity">
            Book Now →
          </Link>
          <p className="mt-4 text-sm font-bold text-white/70">
            Already have an account?{" "}
            <Link href="/login" className="text-white underline hover:opacity-80">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Footer links */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <div>
            <Image src="/camel-logo.png" alt="Camel" width={200} height={70}
              className="h-16 w-auto mb-4 brightness-0 invert" />
            <p className="text-sm font-bold text-white leading-relaxed">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-4">Company</p>
            <ul className="space-y-3">
              <li><Link href="/about"          className="text-base font-bold text-white hover:underline transition-colors">About Us</Link></li>
              <li><Link href="/partner/signup" className="text-base font-bold text-white hover:underline transition-colors">Become a Partner</Link></li>
              <li><Link href="/contact"        className="text-base font-bold text-white hover:underline transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-4">Legal</p>
            <ul className="space-y-3">
              <li><Link href="/terms"   className="text-base font-bold text-white hover:underline transition-colors">Customer Terms</Link></li>
              <li><Link href="/privacy" className="text-base font-bold text-white hover:underline transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="text-base font-bold text-white hover:underline transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-4">Account</p>
            <ul className="space-y-3">
              <li><Link href="/login"    className="text-base font-bold text-white hover:underline transition-colors">Sign In</Link></li>
              <li><Link href="/signup"   className="text-base font-bold text-white hover:underline transition-colors">Create Account</Link></li>
              <li><Link href="/bookings" className="text-base font-bold text-white hover:underline transition-colors">My Bookings</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-white">© {year} Camel Global Ltd. All rights reserved.</p>
          <p className="text-sm font-bold text-white">Registered in England &amp; Wales</p>
        </div>
      </div>
    </footer>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin"))   return <AdminFooter />;
  if (pathname?.startsWith("/driver"))  return <DriverFooter />;
  if (pathname?.startsWith("/partner")) return <PartnerFooter />;
  return <CustomerFooter />;
}