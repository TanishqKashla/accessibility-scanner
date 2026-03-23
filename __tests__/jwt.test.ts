import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { signJWT, verifyJWT } from "@/lib/auth/jwt";
import type { JwtUser } from "@/lib/auth/jwt";

const TEST_SECRET = "test-jwt-secret-for-vitest-only";

const mockUser: JwtUser = {
  userId: "user123",
  orgId: "org456",
  role: "admin",
  email: "test@example.com",
  name: "Test User",
};

describe("JWT", () => {
  beforeAll(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  describe("signJWT", () => {
    it("returns a non-empty string token", () => {
      const token = signJWT(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // JWT has 3 dot-separated parts
      expect(token.split(".")).toHaveLength(3);
    });

    it("produces different tokens for different users", () => {
      const token1 = signJWT(mockUser);
      const token2 = signJWT({ ...mockUser, userId: "different" });
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyJWT", () => {
    it("roundtrips — decodes what was signed", () => {
      const token = signJWT(mockUser);
      const decoded = verifyJWT(token);
      expect(decoded.userId).toBe(mockUser.userId);
      expect(decoded.orgId).toBe(mockUser.orgId);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.name).toBe(mockUser.name);
    });

    it("throws on invalid token", () => {
      expect(() => verifyJWT("not.a.valid.token")).toThrow();
    });

    it("throws on tampered token", () => {
      const token = signJWT(mockUser);
      const tampered = token.slice(0, -5) + "XXXXX";
      expect(() => verifyJWT(tampered)).toThrow();
    });

    it("throws on expired token", () => {
      // Sign with 0 second expiry
      const token = signJWT(mockUser, "0s");
      // Small delay to ensure expiration
      expect(() => verifyJWT(token)).toThrow();
    });

    it("preserves optional name field when undefined", () => {
      const userNoName = { ...mockUser, name: undefined };
      const token = signJWT(userNoName);
      const decoded = verifyJWT(token);
      expect(decoded.name).toBeUndefined();
    });
  });

  describe("missing JWT_SECRET", () => {
    it("throws when JWT_SECRET is not set", () => {
      vi.stubEnv("JWT_SECRET", "");
      expect(() => signJWT(mockUser)).toThrow("Missing JWT_SECRET");
      // Restore for other tests
      vi.stubEnv("JWT_SECRET", TEST_SECRET);
    });
  });
});
