export type PortalRole = "partner" | "admin" | "super_admin";

export function normalizePortalRole(value: unknown): PortalRole {
  if (value === "admin") return "admin";
  if (value === "super_admin") return "super_admin";
  return "partner";
}

export function isAdminRole(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdminRole(role?: string | null) {
  return role === "super_admin";
}