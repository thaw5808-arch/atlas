import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, defaultDestination } from "@/lib/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(defaultDestination(user.role));

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl">Create your profile</h1>
      <p className="mt-2 text-sm text-slate">
        Your budget, results and preferences stay private. They are only used to score options for
        you.
      </p>
      <AuthForm mode="register" returnTo={null} />
      <p className="mt-6 text-sm text-slate">
        Already registered?{" "}
        <Link href="/login" className="link-underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
