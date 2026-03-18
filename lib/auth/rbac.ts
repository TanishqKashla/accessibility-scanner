import type { JwtUser } from "@/lib/auth/jwt";
import type { UserRole } from "@/lib/db/models/User";

export function canAccess(user: JwtUser | null, allowed: UserRole | UserRole[]): boolean {
  if (!user) return false;
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  return allowedList.includes(user.role);
}
