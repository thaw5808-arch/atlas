import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** Best-effort client IP from the proxy headers Vercel (and most others) set.
 *  Falls back to a shared bucket when neither is present, e.g. local dev —
 *  the per-email limit still applies in that case. */
export async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return store.get("x-real-ip") ?? "unknown";
}

/** True once an email or IP has 10 failed logins within the last 15 minutes.
 *  Checked independently — either one being over the limit locks the
 *  attempt out, so a credential-stuffing run spread across many emails from
 *  one IP is caught even though no single email is targeted enough to trip
 *  its own limit, and vice versa. */
export async function isLoginRateLimited(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  return byEmail >= MAX_ATTEMPTS || byIp >= MAX_ATTEMPTS;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ip, success } });
}
