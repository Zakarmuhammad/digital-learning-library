import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit, RATE_LIMITS } from "./rate-limit";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        // Rate limit by email+IP together: caps brute-forcing one account
        // without letting a single slow attacker lock out everyone sharing
        // an IP (offices, NAT, campus networks).
        const forwardedFor = (req?.headers as Record<string, string> | undefined)?.["x-forwarded-for"];
        const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
        const withinLimit = await checkRateLimit({
          identifier: `${credentials.email.toLowerCase()}:${ip}`,
          routeKey: "login",
          ...RATE_LIMITS.login,
        });
        if (!withinLimit) {
          throw new Error("Too many login attempts. Please wait a minute and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        if (user.isSuspended) {
          throw new Error("This account has been suspended. Contact support.");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          hasPaidAccess: user.hasPaidAccess,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.hasPaidAccess = (user as any).hasPaidAccess;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).hasPaidAccess = token.hasPaidAccess;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

/**
 * hasPaidAccess on the session JWT is a point-in-time snapshot from login.
 * It's fine for UI routing, but any route actually gating premium content
 * must re-check the DB (see lib/access-control.ts) — never trust the JWT
 * alone for access decisions, since payment can complete mid-session via
 * webhook without the user logging out and back in.
 */
