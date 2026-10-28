"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo?: "/setup" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isRegister = mode === "register";
  const auth = useMutation({
    mutationFn: () =>
      apiRequest<User>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(isRegister
            ? { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            : {}),
        }),
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      router.replace(returnTo ?? "/dashboard");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    auth.mutate();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold" htmlFor="password">
            Password
          </label>
          {!isRegister && <span className="text-xs text-muted">Minimum 8 characters</span>}
        </div>
        <Input
          id="password"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {auth.error && (
        <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm text-[#8d3f30]" role="alert">
          {auth.error.message}
        </p>
      )}

      <Button className="w-full" disabled={auth.isPending} type="submit">
        {auth.isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" size={17} />
        ) : (
          <ArrowRight aria-hidden="true" size={17} />
        )}
        {isRegister ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        {isRegister ? "Already have an account?" : "New to FocusForge?"}{" "}
        <Link
          className="font-semibold text-primary hover:text-primary-hover"
          href={`${isRegister ? "/login" : "/register"}${returnTo ? "?next=%2Fsetup" : ""}`}
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
