"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: object) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
      execute: (widgetId: string) => void;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

let scriptLoaded = false;

export default function HCaptcha({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    function render() {
      if (!containerRef.current || widgetId.current !== null) return;
      const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
      if (!sitekey || !window.hcaptcha) return;
      widgetId.current = window.hcaptcha.render(containerRef.current, {
        sitekey,
        callback: onVerify,
        "expired-callback": () => {
          onExpire?.();
          onVerify("");
        },
      });
    }

    if (window.hcaptcha) {
      render();
      return;
    }

    if (!scriptLoaded) {
      scriptLoaded = true;
      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      // Script already injected — poll until hcaptcha is ready
      const interval = setInterval(() => {
        if (window.hcaptcha) { clearInterval(interval); render(); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onVerify, onExpire]);

  return <div ref={containerRef} className="mt-2" />;
}