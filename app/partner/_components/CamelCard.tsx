import type { ReactNode } from "react";

export function CamelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_10px_26px_rgba(0,0,0,0.07)]">
      <h1 className="text-2xl font-semibold text-[#003768]">{title}</h1>
      {subtitle ? <p className="mt-2 text-gray-600">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}