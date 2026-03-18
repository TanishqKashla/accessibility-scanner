import jwt from "jsonwebtoken";
import type { UserRole } from "@/lib/db/models/User";

export interface JwtUser {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  name?: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET environment variable.");
  return secret;
}

export function signJWT(payload: JwtUser, expiresIn = "7d") {
  return jwt.sign(payload as object, getSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyJWT(token: string): JwtUser {
  return jwt.verify(token, getSecret()) as JwtUser;
}
