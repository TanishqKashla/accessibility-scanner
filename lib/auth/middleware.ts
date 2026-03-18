import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, type JwtUser } from "@/lib/auth/jwt";

export function getAuth(request: NextRequest): { user: JwtUser } | { error: NextResponse } {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const user = verifyJWT(token);
    return { user };
  } catch {
    return { error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }
}

/**
 * Verify auth and return the user, or null if unauthorized.
 */
export function verifyAuth(request: NextRequest): JwtUser | null {
  const result = getAuth(request);
  if ("error" in result) return null;
  return result.user;
}
