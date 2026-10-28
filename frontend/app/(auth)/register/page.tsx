import { AuthForm } from "@/components/auth/auth-form";
import { Suspense } from "react";

async function RegisterContent({ searchParams }: { searchParams: PageProps<"/register">["searchParams"] }) {
  const { next } = await searchParams;
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary">Start focusing</p>
      <h1 className="mt-2 text-3xl font-bold">Create your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Set up your account now. Your browser extension can use the same login.
      </p>
      <AuthForm mode="register" returnTo={next === "/setup" ? "/setup" : undefined} />
    </div>
  );
}

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return <Suspense fallback={<div className="min-h-72" />}><RegisterContent searchParams={searchParams} /></Suspense>;
}
