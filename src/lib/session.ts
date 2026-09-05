import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

const COOKIE = "atlas_session";
const MAX_AGE_DAYS = 30;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function sign(sessionId: string): string {
  return createHmac("sha256", secret()).update(sessionId).digest("base64url");
}

function unsign(token: string): string | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const sessionId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(sessionId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sessionId;
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 86_400_000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  const store = await cookies();
  store.set(COOKIE, `${session.id}.${sign(session.id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const sessionId = token ? unsign(token) : null;
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  store.delete(COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  preferredCurrency: string;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const sessionId = unsign(token);
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, preferredCurrency: true },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

/** Pages call this themselves — a layout gate alone does not re-run on
 *  client-side navigation between sibling routes. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

/** Only allow in-app relative paths after login. */
export function safeReturnTo(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function defaultDestination(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "REPRESENTATIVE") return "/portal";
  return "/dashboard";
}
