import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as any as { id: string; email: string; role: "USER" | "ADMIN" };
}

/**
 * Re-checks payment status against the DB (not the JWT) — this is the
 * single source of truth check every premium route should call.
 */
export async function requirePaidAccess() {
  const user = await requireUser();
  if (!user) return { ok: false as const, status: 401, message: "Please log in to continue." };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hasPaidAccess: true, isSuspended: true },
  });

  if (!dbUser || dbUser.isSuspended) {
    return { ok: false as const, status: 403, message: "Account not available." };
  }
  if (!dbUser.hasPaidAccess) {
    return {
      ok: false as const,
      status: 403,
      message: "You don't have permission to access this content. Complete the ₦1,000 one-time registration to unlock it.",
    };
  }
  return { ok: true as const, userId: user.id };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, adminId: user.id };
}
