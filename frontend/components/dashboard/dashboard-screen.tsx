"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight,
  Ban,
  Clock3,
  ListTodo,
  LoaderCircle,
  Play,
  Search,
  ShieldCheck,
  Target,
  TimerReset,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api/client";
import type { AnalyticsSummary, BlockedWebsite, FocusSession, Task } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatTaskTime(value: string | null) {
  if (!value) return "Flexible";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function DashboardScreen() {
  const [now, setNow] = useState(0);
  const [search, setSearch] = useState("");
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => apiRequest<Task[]>("/api/backend/tasks") });
  const analyticsQuery = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiRequest<AnalyticsSummary>("/api/backend/analytics/summary"),
    refetchInterval: 60_000,
  });
  const activeQuery = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => apiRequest<FocusSession | null>("/api/backend/sessions/active"),
    refetchInterval: 15_000,
  });
  const sitesQuery = useQuery({ queryKey: ["blocked-websites"], queryFn: () => apiRequest<BlockedWebsite[]>("/api/backend/blocked-websites") });

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const tasksReady = !tasksQuery.isError && tasksQuery.data !== undefined;
  const sitesReady = !sitesQuery.isError && sitesQuery.data !== undefined;
  const sessionReady = !activeQuery.isError && activeQuery.data !== undefined;
  const tasks = tasksReady ? tasksQuery.data : [];
  const activeSession = sessionReady ? activeQuery.data : null;
  const openTasks = tasks.filter((task) => ["PENDING", "SCHEDULED"].includes(task.status));
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const enabledSites = (sitesQuery.data ?? []).filter((site) => site.enabled).length;
  const matchingTasks = openTasks.filter((task) => task.title.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 5);

  const chartData = (analyticsQuery.data?.daily ?? []).map((day) => ({
    key: day.date,
    day: new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(new Date(`${day.date}T12:00:00Z`)),
    minutes: day.focusMinutes,
  }));
  const todayMinutes = analyticsQuery.data?.daily.at(-1)?.focusMinutes ?? 0;
  const weekMinutes = analyticsQuery.data?.focusMinutes ?? 0;
  const completedSessions = analyticsQuery.data?.sessions.completed ?? 0;
  const analyticsReady = Boolean(analyticsQuery.data);
  const taskSummary = analyticsQuery.data?.tasks;
  const taskOutcomes = taskSummary ? [
    { name: "Completed", value: taskSummary.completed, color: "#76bd54" },
    { name: "Missed", value: taskSummary.missed, color: "#e68b73" },
    { name: "Other", value: Math.max(0, taskSummary.total - taskSummary.completed - taskSummary.missed), color: "#dfe6dd" },
  ] : [];
  const remainingSeconds = activeSession && now
    ? Math.max(0, Math.ceil((new Date(activeSession.plannedEnd).getTime() - now) / 1_000))
    : 0;
  const sessionProgress = activeSession
    ? Math.min(100, Math.max(0, ((activeSession.plannedDurationMinutes * 60 - remainingSeconds) / (activeSession.plannedDurationMinutes * 60)) * 100))
    : 0;
  const remainingLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const hour = now ? new Date(now).getHours() : 12;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Focus today", value: analyticsReady ? formatDuration(todayMinutes) : "-", detail: analyticsReady ? `${formatDuration(weekMinutes)} in 7 days` : "Completed sessions", icon: TimerReset, accent: "bg-[#b9ff45]" },
    { label: "Sessions", value: analyticsReady ? completedSessions : "-", detail: "completed in 7 days", icon: Target, accent: "bg-[#e8efe4]" },
    { label: "Open tasks", value: tasksReady ? openTasks.length : "-", detail: tasksQuery.isError ? "Tasks unavailable" : tasksReady ? `${completedTasks} completed` : "Loading tasks", icon: ListTodo, accent: "bg-[#f3ebe1]" },
    { label: "Blocked sites", value: sitesReady ? enabledSites : "-", detail: sitesQuery.isError ? "Sites unavailable" : !sitesReady ? "Loading sites" : !enabledSites ? "Add sites to block" : !sessionReady ? "Session status unavailable" : activeSession ? "shield active" : "ready for focus", icon: Ban, accent: "bg-[#e8e5f2]" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-8 md:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 py-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}</h1>
          <p className="mt-1.5 text-sm text-muted">Your work, at a glance.</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <Input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" className="h-10 rounded-md border-border bg-white pl-10" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Productivity summary">
            {stats.map(({ label, value, detail, icon: Icon, accent }) => (
              <Card key={label} className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", accent)}><Icon size={14} /></span>
                    <p className="text-xs font-medium text-muted">{label}</p>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-[11px] text-muted">{detail}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div><p className="text-sm font-semibold">Focus activity</p><CardTitle className="mt-2 text-2xl font-semibold tabular-nums">{analyticsReady ? formatDuration(weekMinutes) : "-"}</CardTitle><p className="mt-1 text-xs text-muted">Completed focus time in the last 7 days</p>{analyticsQuery.isError && analyticsReady && <p className="mt-1 text-xs text-[#a84e3d]">Showing last available data. <button className="underline" onClick={() => analyticsQuery.refetch()}>Retry</button></p>}</div>
              <Badge variant="muted">7 days</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="h-[280px] w-full" role={analyticsReady ? "img" : undefined} aria-label={analyticsReady ? `Completed focus time over 7 days: ${chartData.map((day) => `${day.day} ${day.minutes} minutes`).join(", ")}` : undefined}>
                {analyticsQuery.isPending && <div className="flex h-full items-center justify-center gap-2 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />Loading activity</div>}
                {analyticsQuery.isError && !analyticsReady && <div className="flex h-full flex-col items-center justify-center gap-3 text-sm"><p className="text-muted">Activity could not be loaded.</p><Button variant="secondary" size="sm" onClick={() => analyticsQuery.refetch()}>Try again</Button></div>}
                {chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid vertical={false} stroke="#edf0eb" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#7b827c", fontSize: 11, fontWeight: 600 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#7b827c", fontSize: 11 }} width={48} tickFormatter={(value) => `${value}m`} />
                      <Tooltip cursor={{ fill: "rgba(185,255,69,0.08)" }} contentStyle={{ border: "0", borderRadius: "8px", boxShadow: "0 12px 30px rgba(20,25,20,.12)", fontSize: "12px" }} formatter={(value) => [`${value} min`, "Focus"]} />
                      <Bar dataKey="minutes" radius={[7, 7, 7, 7]} maxBarSize={44}>
                        {chartData.map((day, index) => <Cell key={day.key} fill={index === chartData.length - 1 ? "#8ac943" : "#bfcbb8"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Task activity</CardTitle><p className="mt-1 text-xs text-muted">The next items ready for focused work</p></div>
              <Button asChild variant="ghost" size="sm"><Link href="/tasks">View all <ArrowUpRight size={15} /></Link></Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-black/[0.05]">
                {matchingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-3.5">
                    <span className={cn("size-2 rounded-full", task.priority === "HIGH" ? "bg-[#ff6e5e]" : task.priority === "MEDIUM" ? "bg-[#f5bd3d]" : "bg-[#7dcf70]")} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{task.title}</p><p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted"><Clock3 size={12} />{formatTaskTime(task.scheduledStart)}</p></div>
                    <Badge variant="muted">{task.priority.toLowerCase()}</Badge>
                  </div>
                ))}
                {tasksQuery.isPending && <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />Loading tasks</div>}
                {tasksQuery.isError && <div className="flex flex-col items-center gap-3 py-10 text-sm"><p className="text-muted">Tasks could not be loaded.</p><Button variant="secondary" size="sm" onClick={() => tasksQuery.refetch()}>Try again</Button></div>}
                {tasksReady && !matchingTasks.length && <p className="py-10 text-center text-sm text-muted">{search.trim() ? "No tasks match your search." : "No open tasks yet."}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className={cn("overflow-hidden border border-black/[0.06]", activeSession ? "bg-[#171b16] text-white" : "bg-[#f0f4e9]")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between"><span className={cn("flex size-10 items-center justify-center rounded-full", activeSession ? "bg-white/10 text-[#b9ff45]" : "bg-white/65")}><TimerReset size={19} /></span><Badge variant={activeSession ? "green" : "muted"}>{activeQuery.isError ? "Unavailable" : !sessionReady ? "Loading" : activeSession ? "Active" : "Ready"}</Badge></div>
              <p className={cn("mt-6 text-xs font-semibold", activeSession ? "text-white/55" : "text-black/55")}>Focus session</p>
              <h2 className="mt-1 break-words text-lg font-semibold">{!sessionReady ? "Checking session" : activeSession ? activeSession.task?.title ?? "Focused work" : "Time to focus"}</h2>
              {activeSession ? <p className="mt-5 font-mono text-4xl font-medium">{remainingLabel}</p> : !sessionReady ? <p className="mt-2 text-sm leading-6 text-muted">{activeQuery.isError ? "Session status could not be loaded." : "Loading session status."}</p> : <p className="mt-2 text-sm leading-6 text-muted">No session in progress.</p>}
              {activeSession && <Progress value={sessionProgress} className="mt-5 bg-white/10 [&>div]:bg-[#b9ff45]" />}
              {activeQuery.isError ? <Button className="mt-6 w-full" variant="secondary" onClick={() => activeQuery.refetch()}>Try again</Button> : <Button asChild className="mt-6 w-full" variant={activeSession ? "focus" : "secondary"}><Link href="/focus">{activeSession ? "Return to session" : "Set up focus"}<ArrowUpRight size={16} /></Link></Button>}
            </CardContent>
          </Card>

          <Card className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
            <CardHeader><CardTitle className="text-sm">Quick actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/tasks" className="flex min-h-20 flex-col items-center justify-center rounded-lg bg-[#f1f3f0] text-xs font-bold transition hover:bg-[#e8ebe6]"><ListTodo size={18} /><span className="mt-2">New task</span></Link>
              <Link href="/focus" className="flex min-h-20 flex-col items-center justify-center rounded-lg bg-[#f1f3f0] text-xs font-bold transition hover:bg-[#e8ebe6]"><Play size={18} /><span className="mt-2">Start focus</span></Link>
            </CardContent>
          </Card>

          <Card className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
            <CardHeader><CardTitle className="text-sm">Task outcomes</CardTitle><p className="mt-1 text-xs text-muted">All tasks to date</p></CardHeader>
            <CardContent>
              {taskSummary && taskSummary.total > 0 ? (
                <>
                  <div className="relative h-44 w-full" role="img" aria-label={`${taskSummary.total} tasks: ${taskSummary.completed} completed, ${taskSummary.missed} missed, ${Math.max(0, taskSummary.total - taskSummary.completed - taskSummary.missed)} other. ${taskSummary.completionRate}% complete.`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={taskOutcomes} dataKey="value" innerRadius={56} outerRadius={72} stroke="none" isAnimationActive={false}>
                          {taskOutcomes.map((outcome) => <Cell key={outcome.name} fill={outcome.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} tasks`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold tabular-nums">{taskSummary.completionRate}%</span>
                      <span className="text-[11px] text-muted">complete</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    {taskOutcomes.map((outcome) => <div key={outcome.name} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: outcome.color }} /><span className="flex-1 text-muted">{outcome.name}</span><span className="font-semibold tabular-nums">{outcome.value}</span></div>)}
                  </div>
                  {analyticsQuery.isError && <p className="mt-3 text-xs text-[#a84e3d]">Showing last available data. <button className="underline" onClick={() => analyticsQuery.refetch()}>Retry</button></p>}
                </>
              ) : taskSummary ? (
                <p className="py-7 text-sm text-muted">Task outcomes will appear after you add a task.</p>
              ) : analyticsQuery.isPending ? (
                <div className="flex items-center gap-2 py-7 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />Loading outcomes</div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => analyticsQuery.refetch()}>Try again</Button>
              )}
            </CardContent>
          </Card>

          <Card id="sites" className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-lg bg-[#e8efe4]"><ShieldCheck size={18} /></span><span className={cn("size-2 rounded-full", sitesReady && sessionReady ? "bg-[#8bea2d]" : "bg-[#aeb8af]")} /></div>
              <p className="mt-5 text-xs font-semibold text-muted">Distraction shield</p>
              <p className="mt-1 text-2xl font-semibold">{sitesReady ? `${enabledSites} sites` : "-"}</p>
              <p className="mt-1 text-xs text-muted">{sitesQuery.isError ? "Site list could not be loaded" : !sitesReady ? "Loading sites" : !enabledSites ? "Add a site to enable protection" : !sessionReady ? "Session status unavailable" : activeSession ? "Protection is active now" : "Ready for your next session"}</p>
              {sitesQuery.isError && <Button variant="secondary" size="sm" className="mt-3" onClick={() => sitesQuery.refetch()}>Try again</Button>}
              <Button asChild variant="ghost" size="sm" className="mt-4 px-0"><Link href="/blocked-sites">Manage sites <ArrowUpRight size={15} /></Link></Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
