import { describe, it, expect } from "vitest";
import { canAccess } from "@/lib/auth/rbac";
import type { JwtUser } from "@/lib/auth/jwt";

const makeUser = (role: "admin" | "auditor" | "viewer"): JwtUser => ({
  userId: "u1",
  orgId: "o1",
  role,
  email: "test@example.com",
});

describe("canAccess", () => {
  it("returns false for null user", () => {
    expect(canAccess(null, "admin")).toBe(false);
  });

  it("returns true when user role matches single allowed role", () => {
    expect(canAccess(makeUser("admin"), "admin")).toBe(true);
  });

  it("returns false when user role does not match single allowed role", () => {
    expect(canAccess(makeUser("viewer"), "admin")).toBe(false);
  });

  it("returns true when user role is in allowed array", () => {
    expect(canAccess(makeUser("auditor"), ["admin", "auditor"])).toBe(true);
  });

  it("returns false when user role is not in allowed array", () => {
    expect(canAccess(makeUser("viewer"), ["admin", "auditor"])).toBe(false);
  });

  it("handles all three roles correctly", () => {
    expect(canAccess(makeUser("admin"), "admin")).toBe(true);
    expect(canAccess(makeUser("auditor"), "auditor")).toBe(true);
    expect(canAccess(makeUser("viewer"), "viewer")).toBe(true);
  });

  it("returns true when all roles are allowed", () => {
    expect(canAccess(makeUser("viewer"), ["admin", "auditor", "viewer"])).toBe(true);
  });

  it("returns false for null user even with all roles allowed", () => {
    expect(canAccess(null, ["admin", "auditor", "viewer"])).toBe(false);
  });
});
