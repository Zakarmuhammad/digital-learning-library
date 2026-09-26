import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

// PATCH /api/admin/users/:id   Body: { action: "suspend"|"activate"|"grant_access"|"revoke_access" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { action } = await req.json();
  const valid = ["suspend", "activate", "grant_access", "revoke_access"];
  if (!valid.includes(action)) {
    return NextResponse.json({ error: `action must be one of ${valid.join(", ")}` }, { status: 400 });
  }

  const data: Record<string, boolean> = {
    suspend: { isSuspended: true },
    activate: { isSuspended: false },
    grant_access: { hasPaidAccess: true },
    revoke_access: { hasPaidAccess: false },
  }[action] as any;

  const user = await prisma.user.update({ where: { id: params.id }, data });

  await prisma.auditLog.create({
    data: {
      adminId: admin.adminId,
      action: action.toUpperCase(),
      entity: "User",
      entityId: user.id,
    },
  });

  return NextResponse.json({ user });
}
