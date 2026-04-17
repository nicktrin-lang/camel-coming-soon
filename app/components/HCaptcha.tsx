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
    onHCaptchaLoad?: () => void;
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const onLoadCallbacks: Array<() => void> = [];

function loadHCaptchaScript(cb: () => void) {
  if (scriptLoaded && window.hcaptcha) { cb(); return; }
  onLoadCallbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;

  window.onHCaptchaLoad = () => {
    scriptLoaded = true;
    onLoadCallbacks.forEach(fn => fn());
    onLoadCallbacks.length = 0;
  };

  const script = document.createElement("script");
  script.src = "https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaLoad";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default function HCaptcha({ onVerify, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    function render() {
      if (!mounted || !containerRef.current || widgetId.current !== null) return;
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

    loadHCaptchaScript(render);

    return () => { mounted = false; };
  }, [onVerify, onExpire]);

  return <div ref={containerRef} className="mt-2" />;
}