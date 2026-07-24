import { describe, expect, it } from "vitest";
import { hasPermission, normalizeRole, roleFromMetadata, ROLE_PERMISSIONS } from "./permissions.js";

describe("roles y permisos", () => {
  it("normaliza el rol legado admin a owner", () => {
    expect(normalizeRole("admin")).toBe("owner");
    expect(roleFromMetadata({ role: "admin" })).toBe("owner");
    expect(ROLE_PERMISSIONS).not.toHaveProperty("admin");
  });

  it("separa permisos operativos de permisos sensibles", () => {
    expect(hasPermission("inventory", "inventory.write")).toBe(true);
    expect(hasPermission("inventory", "users.roles.write")).toBe(false);
    expect(hasPermission("operator", "reservations.write")).toBe(true);
    expect(hasPermission("support", "settings.write")).toBe(false);
    expect(hasPermission("owner", "audit.read")).toBe(true);
  });
});
