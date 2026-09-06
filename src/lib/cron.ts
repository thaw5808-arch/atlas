import { NextResponse } from "next/server";

/**
 * Every /api/cron/* route runs on a schedule rather than behind a signed-in
 * session, so it checks a shared secret instead. Vercel sends this header
 * automatically on scheduled invocations once CRON_SECRET is set as a
 * project environment variable.
 *
 * Returns a response to send back immediately when the check fails, or
 * `null` when the request is authorized.
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return null;
}
