"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { createSession, defaultDestination, destroySession, safeReturnTo } from "../session";

const DUMMY_HASH = "$2b$12$Q9y6b4o1XZq0m8m2Y9m2ne8m0mQyq2n1lJ5nGkq0V6m5wQx0V1u2K";

export type AuthState = { error?: string } | null;

const credentials = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const registration = credentials.extend({
  name: z.string().min(2, "Enter your name"),
});

const SYSTEM_COLLECTIONS = [
  { name: "Dream", color: "brass" },
  { name: "Target", color: "viridian" },
  { name: "Safe", color: "slate" },
  { name: "Affordable", color: "viridian" },
  { name: "Scholarship target", color: "brass" },
  { name: "Research later", color: "slate" },
];

export async function register(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registration.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account already uses that email address" };

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      studentProfile: { create: {} },
      decisionPreference: { create: {} },
      collections: {
        create: SYSTEM_COLLECTIONS.map((collection) => ({ ...collection, system: true })),
      },
    },
  });

  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your email address and password" };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Compare against a dummy hash when the user is missing so the response time
  // does not reveal which addresses have accounts.
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "Those details don't match an account" };

  await createSession(user.id);
  const returnTo = safeReturnTo(formData.get("returnTo"));
  redirect(returnTo ?? defaultDestination(user.role));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
