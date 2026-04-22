"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

function PortalFooterBase({ children }: { children: React.ReactNode }) {
  return (
    <footer className="w-full border-t border-white/10 bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {children}
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {year} Camel Global Ltd. All rights reserved.</p>
          <p>Registered in England &amp; Wales</p>
        </div>
      </div>
    </footer>
  );
}

function PortalFooterLogo() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/">
        <Image src="/camel-logo.png" alt="Camel Global Ltd" width={160} height={58} className="h-[48px] w-auto brightness-0 invert" />
      </Link>
      <p className="max-w-[220px] text-xs leading-relaxed text-white/60">Meet &amp; greet car hire, delivered to your door.</p>
    </div>
  );
}

function PartnerFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <PortalFooterLogo />
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
            <Link href="/partner/about" className="text-white/80 hover:text-white transition-colors">About Us</Link>
            <Link href="/partner/contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
            <Link href="/partner/terms" className="text-white/80 hover:text-white transition-colors">Partner Terms</Link>
            <Link href="/partner/operating-rules" className="text-white/80 hover:text-white transition-colors">Operating Agreement</Link>
            <Link href="/partner/privacy" className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/partner/cookies" className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </PortalFooterBase>
  );
}

function DriverFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PortalFooterLogo />
        <Link href="/driver/login" className="text-sm text-white/80 hover:text-white transition-colors">Driver Login</Link>
      </div>
    </PortalFooterBase>
  );
}

function AdminFooter() {
  return (
    <PortalFooterBase>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <PortalFooterLogo />
        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
            <Link href="/admin/about" className="text-white/80 hover:text-white transition-colors">About Us</Link>
            <Link href="/admin/contact" className="text-white/80 hover:text-white transition-colors">Contact</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
            <Link href="/admin/terms" className="text-white/80 hover:text-white transition-colors">Partner Terms</Link>
            <Link href="/admin/operating-rules" className="text-white/80 hover:text-white transition-colors">Operating Agreement</Link>
            <Link href="/admin/privacy" className="text-white/80 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/admin/cookies" className="text-white/80 hover:text-white transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </PortalFooterBase>
  );
}

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

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin"))   return <AdminFooter />;
  if (pathname?.startsWith("/driver"))  return <DriverFooter />;
  if (pathname?.startsWith("/partner")) return <PartnerFooter />;
  return <CustomerFooter />;
}