"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ListTodo, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Puzzle, ShieldCheck, TimerReset, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Tasks", icon: ListTodo, href: "/tasks" },
  { label: "Focus", icon: TimerReset, href: "/focus" },
  { label: "Blocked sites", icon: ShieldCheck, href: "/blocked-sites" },
  { label: "Extension", icon: Puzzle, href: "/setup" },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const userQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<User>("/api/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (userQuery.error instanceof ApiError && userQuery.error.status === 401) router.replace("/login");
  }, [router, userQuery.error]);

  async function logout() {
    await apiRequest<null>("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.replace("/login");
  }

  const email = userQuery.data?.email;
  const initials = email?.slice(0, 2).toUpperCase() ?? "FF";
  const topNavigation = navigation;

  return (
    <div className={cn(
      "min-h-screen bg-background lg:grid lg:transition-[grid-template-columns] lg:duration-200 motion-reduce:transition-none",
      sidebarExpanded ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[72px_minmax(0,1fr)]",
    )}>
      <aside id="workspace-sidebar" className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[224px] -translate-x-full flex-col overflow-x-hidden border-r border-black/5 bg-white px-3 py-4 transition-transform motion-reduce:transition-none lg:sticky lg:top-0 lg:h-screen lg:w-full lg:translate-x-0",
        mobileNavOpen && "translate-x-0",
      )}>
        <div className={cn("flex h-10 items-center justify-between", !sidebarExpanded && "lg:justify-center")}>
          <div className="flex items-center gap-2.5">
          <Logo compact className="shrink-0" />
          <span className={cn("whitespace-nowrap text-base font-semibold", !sidebarExpanded && "lg:hidden")}>FocusForge</span>
          </div>
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={19} /></Button>
        </div>
        <nav className="mt-10 space-y-2" aria-label="Workspace navigation">
          {navigation.map(({ label, icon: Icon, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                title={label}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-[#edf0ec] hover:text-foreground",
                  !sidebarExpanded && "lg:justify-center lg:px-0",
                  active && "bg-foreground text-white hover:bg-foreground hover:text-white",
                )}
              >
                <Icon size={19} className="shrink-0" aria-hidden="true" />
                <span className={cn("whitespace-nowrap", !sidebarExpanded && "lg:sr-only")}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
          <div className={cn("flex items-center gap-3 px-2", !sidebarExpanded && "lg:justify-center lg:px-0")} title={email ?? "Loading account"}>
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5cfe0] text-xs font-bold text-[#783653]", userQuery.isPending && "animate-pulse")}>
              {initials}
            </span>
            <span className={cn("min-w-0 truncate text-xs font-semibold", !sidebarExpanded && "lg:sr-only")}>{email ?? "Loading account"}</span>
          </div>
          <Button className={cn("w-full justify-start", sidebarExpanded ? "lg:px-3" : "lg:justify-center lg:px-0")} variant="ghost" onClick={logout} disabled={!email} aria-label="Sign out" title="Sign out">
            <LogOut size={18} className="shrink-0" /><span className={cn(!sidebarExpanded && "lg:sr-only")}>Sign out</span>
          </Button>
        </div>
      </aside>

      {mobileNavOpen && <button className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation overlay" />}

      <main className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-black/5 bg-white px-5 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></Button>
          <Logo />
          <span className="size-10" />
        </header>
        <header className="hidden h-[72px] items-center justify-between pr-8 lg:flex xl:pr-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarExpanded((expanded) => !expanded)}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarExpanded}
            aria-controls="workspace-sidebar"
          >
            {sidebarExpanded ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </Button>
          <nav className="flex items-center gap-1 rounded-lg bg-white/70 p-1 shadow-[0_2px_14px_rgba(20,25,20,0.04)]" aria-label="Primary navigation">
            {topNavigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "rounded-md px-4 py-2 text-xs font-semibold text-muted transition hover:text-foreground",
                  pathname === item.href && "bg-white text-foreground shadow-sm",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-3 pr-1.5 shadow-[0_2px_14px_rgba(20,25,20,0.04)]">
            <span className="max-w-36 truncate text-xs font-semibold">{email ?? "Loading"}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#b9ff45] text-[10px] font-extrabold">{initials}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
