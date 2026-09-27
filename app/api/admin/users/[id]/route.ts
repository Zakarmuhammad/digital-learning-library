import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/access-control";

// PATCH /api/admin/users/:id   Body: { action: "suspend"|"activate"|"grant_access"|"revoke_access" }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  type UserAction = "suspend" | "activate" | "grant_access" | "revoke_access";
  const VALID_ACTIONS: UserAction[] = ["suspend", "activate", "grant_access", "revoke_access"];

  const body = (await req.json()) as { action?: string };
  const action = body.action;

  if (!action || !VALID_ACTIONS.includes(action as UserAction)) {
    return NextResponse.json(
      { error: `action must be one of ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const validatedAction = action as UserAction;

  const actionData: Record<
    UserAction,
    { isSuspended?: boolean; hasPaidAccess?: boolean }
  > = {
    suspend: { isSuspended: true },
    activate: { isSuspended: false },
    grant_access: { hasPaidAccess: true },
    revoke_access: { hasPaidAccess: false },
  };

  const data = actionData[validatedAction];

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.adminId,
      action: validatedAction.toUpperCase(),
      entity: "User",
      entityId: user.id,
    },
  });

  return NextResponse.json({ user });
}
