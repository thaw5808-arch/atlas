"use client";

import { useActionState } from "react";
import { login, register, type AuthState } from "@/lib/actions/auth";

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo: string | null }) {
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <form action={formAction} className="panel mt-6 space-y-4 p-5">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" name="name" className="input" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {state?.error && (
        <p className="rounded-lg bg-rust-soft px-3 py-2 text-sm text-rust">{state.error}</p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
