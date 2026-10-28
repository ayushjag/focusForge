"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export function SetupAccountActions({ header = false }: { header?: boolean }) {
  const user = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest<User>("/api/auth/me"), retry: false });

  if (header) {
    return <Link href={user.data ? "/focus" : "/login?next=%2Fsetup"}
      className="text-sm font-semibold text-muted hover:text-foreground">
      {user.data ? "Focus Room" : "Sign in"}
    </Link>;
  }

  if (user.isPending) return <p className="text-sm text-muted">Checking account...</p>;
  if (user.data) return <Button asChild className="w-full"><Link href="/focus">Open Focus Room <ArrowRight size={16} /></Link></Button>;

  return <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
    <Button asChild><Link href="/register?next=%2Fsetup">Create account</Link></Button>
    <Button asChild variant="secondary"><Link href="/login?next=%2Fsetup">Sign in</Link></Button>
  </div>;
}
