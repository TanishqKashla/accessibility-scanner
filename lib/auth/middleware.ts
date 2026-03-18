import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/db/models/User";

export interface JwtUser {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  name?: string;
}

export async function getAuth(
  // kept for backward-compatibility — no longer used, session is read from cookies
  _req?: unknown
): Promise<{ user: JwtUser } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    user: {
      userId: session.user.id,
      orgId: session.user.orgId,
      role: session.user.role as UserRole,
      email: session.user.email,
      name: session.user.name ?? undefined,
    },
  };
}

export async function verifyAuth(_req?: unknown): Promise<JwtUser | null> {
  const result = await getAuth();
  if ("error" in result) return null;
  return result.user;
}
