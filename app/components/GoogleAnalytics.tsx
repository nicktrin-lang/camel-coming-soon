"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

// portal.camel-global.com → partner/admin GA property
// all other hostnames (camel-global.com, test.camel-global.com, localhost) → customer property
function resolveGaId(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname === "portal.camel-global.com"
    ? "G-YCZMDQJDM7"
    : "G-1Y758X38G4";
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const [gaId, setGaId] = useState<string>("");

  // Set the ID once on mount (needs window)
  useEffect(() => {
    setGaId(resolveGaId());
  }, []);

  // Fire page_view on every client-side navigation after gtag is loaded
  useEffect(() => {
    if (!gaId || !window.gtag) return;
    window.gtag("config", gaId, {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [gaId, pathname]);

  // Don't render anything until we know the ID
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname + window.location.search,
              page_title: document.title,
              page_location: window.location.href
            });
          `,
        }}
      />
    </>
  );
}