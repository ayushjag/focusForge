import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold">Sign in to your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Pick up your tasks and focus session where you left them.
      </p>
      <AuthForm mode="login" returnTo={next === "/setup" ? "/setup" : undefined} />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return <Suspense fallback={<div className="min-h-72" />}><LoginContent searchParams={searchParams} /></Suspense>;
}
