import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary">Start focusing</p>
      <h1 className="mt-2 text-3xl font-bold">Create your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Set up your account now. Your browser extension can use the same login.
      </p>
      <AuthForm mode="register" />
    </div>
  );
}
