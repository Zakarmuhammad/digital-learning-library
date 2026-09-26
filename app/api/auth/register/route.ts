import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const withinLimit = await checkRateLimit({
    identifier: getClientIp(req),
    routeKey: "register",
    ...RATE_LIMITS.register,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Too many registration attempts from this network. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { fullName, email, password, phone } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { fullName, email: normalizedEmail, passwordHash, phone },
    select: { id: true, email: true, fullName: true },
  });

  const { subject, html } = welcomeEmail(user.fullName);
  await sendEmail({ to: user.email, subject, html });

  return NextResponse.json({ user });
}
