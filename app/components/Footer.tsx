"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  const isPortal =
    pathname?.startsWith("/partner") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/driver");

  // Portal pages: open policy links in new tab so users don't leave the portal
  const policyProps = isPortal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-gradient-to-br from-[#003768] to-[#005b9f] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

          {/* Logo + tagline */}
          <div className="flex flex-col gap-3">
            <Link href="/" {...(isPortal ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              <Image
                src="/camel-logo.png"
                alt="Camel Global Ltd"
                width={160}
                height={58}
                className="h-[48px] w-auto brightness-0 invert"
              />
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-white/60">
              Meet &amp; greet car hire, delivered to your door.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-wrap gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Company</span>
              <Link href="/about" className="text-white/80 hover:text-white transition-colors" {...policyProps}>About Us</Link>
              <Link href="/partner/signup" className="text-white/80 hover:text-white transition-colors" {...policyProps}>Become a Partner</Link>
              <a href="mailto:contact@camel-global.com" className="text-white/80 hover:text-white transition-colors">Contact</a>
            </div>

            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Legal</span>
              <Link href="/terms" className="text-white/80 hover:text-white transition-colors" {...policyProps}>Customer Terms</Link>
              <Link href="/partner/terms" className="text-white/80 hover:text-white transition-colors" {...policyProps}>Partner Terms</Link>
              <Link href="/privacy" className="text-white/80 hover:text-white transition-colors" {...policyProps}>Privacy Policy</Link>
              <Link href="/cookies" className="text-white/80 hover:text-white transition-colors" {...policyProps}>Cookie Policy</Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Portals</span>
              <Link href="/test-booking" className="text-white/80 hover:text-white transition-colors" {...(isPortal ? policyProps : {})}>Customer Portal</Link>
              <Link href="/partner/login" className="text-white/80 hover:text-white transition-colors" {...(isPortal ? policyProps : {})}>Partner Portal</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-white/40">
          <p>© {year} Camel Global Ltd. All rights reserved.</p>
          <p>Registered in England &amp; Wales — <span className="italic">registration details to be updated</span></p>
        </div>
      </div>
    </footer>
  );
}