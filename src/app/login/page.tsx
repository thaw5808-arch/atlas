import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, defaultDestination } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(defaultDestination(user.role));
  const { returnTo } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-slate">
        Sign in to see your matches, scenarios and application plan.
      </p>
      <AuthForm mode="login" returnTo={returnTo ?? null} />
      <p className="mt-6 text-sm text-slate">
        No account yet?{" "}
        <Link href="/register" className="link-underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
