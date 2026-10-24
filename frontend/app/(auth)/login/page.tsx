import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary">Welcome back</p>
      <h1 className="mt-2 text-3xl font-bold">Sign in to your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Pick up your tasks and focus session where you left them.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
