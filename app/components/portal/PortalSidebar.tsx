"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalRole = "partner" | "admin" | "super_admin";

type Props = {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  roles: PortalRole[];
};

const navItems: NavItem[] = [
  {
    href: "/admin/approvals",
    label: "Partner Approvals",
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/accounts",
    label: "Account Management",
    roles: ["admin", "super_admin"],
  },
  {
    href: "/partner/requests",
    label: "Requests",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/bookings",
    label: "Bookings",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/fleet",
    label: "Car Fleet",
    roles: ["partner", "admin", "super_admin"],
  },
  {
    href: "/partner/account",
    label: "Account Management",
    roles: ["partner"],
  },
  {
    href: "/partner/reports",
    label: "Report Management",
    roles: ["partner", "admin", "super_admin"],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getHomeHref(role: PortalRole) {
  return role === "partner" ? "/partner/dashboard" : "/admin/approvals";
}

function getPortalTitle(role: PortalRole) {
  return role === "partner" ? "Partner Portal" : "Admin Portal";
}

function getPortalSubtitle(role: PortalRole) {
  return role === "partner" ? "Operations dashboard" : "System administration";
}

function getProfileHref(role: PortalRole) {
  return role === "partner" ? "/partner/profile" : "/admin/accounts";
}

function getFooterButtonLabel(role: PortalRole) {
  return role === "partner" ? "Edit Profile" : "Manage Accounts";
}

export default function PortalSidebar({ role, open, onClose }: Props) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 z-40 w-[290px] border-r border-white/10",
          "bg-gradient-to-b from-[#003768] to-[#005b9f] text-white shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          "top-20 h-[calc(100vh-80px)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="border-b border-white/10 px-6 pt-8 pb-6">
            <Link href={getHomeHref(role)} onClick={onClose} className="block">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Camel Global
              </div>

              <div className="mt-2 text-2xl font-semibold">{getPortalTitle(role)}</div>

              <div className="mt-3 text-sm text-white/75">{getPortalSubtitle(role)}</div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Navigation
            </div>

            <div className="space-y-2">
              {visibleItems.map((item) => {
                const active = isActive(pathname || "", item.href);

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "block rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active
                        ? "bg-white text-[#003768] shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                        : "text-white/90 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 px-5 py-5">
            <Link
              href={getProfileHref(role)}
              onClick={onClose}
              className="block rounded-2xl bg-[#ff7a00] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] hover:opacity-95"
            >
              {getFooterButtonLabel(role)}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}