"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

// This component handles SPA page_view events on client-side navigation only.
// The actual gtag scripts are injected in app/layout.tsx server-side.
export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !window.gtag) return;
    // gtag was initialised in layout.tsx — just fire the page view
    const allIds = (window as any).__GA_IDS__ as string[] | undefined;
    if (!allIds?.length) return;
    allIds.forEach(id => {
      window.gtag!("config", id, {
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
        page_location: window.location.href,
      });
    });
  }, [pathname]);

  return null;
}