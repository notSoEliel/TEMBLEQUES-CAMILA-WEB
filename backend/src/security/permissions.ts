import type { Role } from "../models/User.js";

export type Permission =
  | "audit.read"
  | "contacts.manage"
  | "coupons.manage"
  | "dashboard.read"
  | "incidents.read"
  | "incidents.write"
  | "inventory.read"
  | "inventory.write"
  | "maintenance.write"
  | "observability.read"
  | "observability.write"
  | "payments.refund"
  | "payments.reconcile"
  | "reports.fiscal"
  | "products.read"
  | "products.write"
  | "reports.read"
  | "reservations.read"
  | "reservations.write"
  | "settings.write"
  | "users.read"
  | "users.roles.write";

const ownerPermissions: ReadonlySet<Permission> = new Set([
  "audit.read",
  "contacts.manage",
  "coupons.manage",
  "dashboard.read",
  "incidents.read",
  "incidents.write",
  "inventory.read",
  "inventory.write",
  "maintenance.write",
  "observability.read",
  "observability.write",
  "payments.refund",
  "payments.reconcile",
  "reports.fiscal",
  "products.read",
  "products.write",
  "reports.read",
  "reservations.read",
  "reservations.write",
  "settings.write",
  "users.read",
  "users.roles.write",
]);

export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlySet<Permission>>> = {
  owner: ownerPermissions,
  operator: new Set([
    "contacts.manage",
    "coupons.manage",
    "dashboard.read",
    "incidents.read",
    "incidents.write",
    "products.read",
    "reports.read",
    "observability.read",
    "reservations.read",
    "reservations.write",
    "users.read",
  ]),
  inventory: new Set([
    "dashboard.read",
    "incidents.read",
    "inventory.read",
    "inventory.write",
    "maintenance.write",
    "products.read",
    "products.write",
    "reservations.read",
  ]),
  support: new Set([
    "contacts.manage",
    "dashboard.read",
    "incidents.read",
    "incidents.write",
    "reservations.read",
    "users.read",
  ]),
  client: new Set(),
};

/**
 * Converts values received from old Clerk metadata or old MongoDB documents
 * into the current role vocabulary. The legacy value is accepted only at this
 * compatibility boundary and is never returned or persisted.
 */
export function normalizeRole(role: Role | string | undefined): Role {
  if (role === "admin") return "owner";
  if (role === "owner" || role === "operator" || role === "inventory" || role === "support") {
    return role;
  }
  return "client";
}

export function roleFromMetadata(metadata: unknown): Role {
  if (!metadata || typeof metadata !== "object") return "client";
  const role = (metadata as Record<string, unknown>).role;
  return normalizeRole(typeof role === "string" ? role : undefined);
}

export function hasPermission(role: Role | string | undefined, permission: Permission): boolean {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole].has(permission);
}
