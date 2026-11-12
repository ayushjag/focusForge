"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, LoaderCircle, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { WeeklyPlan, WeeklyReview } from "@/lib/api/types";

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function formatDuration(minutes: number) {
  const amount = Math.abs(minutes);
  const sign = minutes < 0 ? "-" : "";
  const hours = Math.floor(amount / 60);
  const remainder = amount % 60;
  if (!hours) return `${sign}${amount}m`;
  return remainder ? `${sign}${hours}h ${remainder}m` : `${sign}${hours}h`;
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function weekRange(report: WeeklyReview) {
  const startYear = report.weekStart.slice(0, 4);
  const endYear = report.weekEnd.slice(0, 4);
  return `${formatDate(report.weekStart, { month: "short", day: "numeric", ...(startYear !== endYear ? { year: "numeric" } : {}) })} - ${formatDate(report.weekEnd, { month: "short", day: "numeric", year: "numeric" })}`;
}

function WeeklyPlanEditor({ plan, onSaved }: { plan: WeeklyPlan; onSaved: () => void }) {
  const [drafts, setDrafts] = useState(() => Array.from({ length: 3 }, (_, index) => plan.priorities[index] ?? ""));
  const [error, setError] = useState<string | null>(null);
  const savePlan = useMutation({
    mutationFn: (priorities: string[]) => apiRequest<WeeklyPlan>("/api/backend/reports/weekly/plan", {
      method: "PUT",
      body: JSON.stringify({ weekStart: plan.weekStart, priorities }),
    }),
    onSuccess: onSaved,
  });
  const priorities = drafts.map((priority) => priority.trim()).filter(Boolean);
  const unchanged = JSON.stringify(priorities) === JSON.stringify(plan.priorities);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (priorities.some((priority) => priority.length > 120)) {
      setError("Keep each priority under 120 characters.");
      return;
    }
    if (new Set(priorities.map((priority) => priority.toLowerCase())).size !== priorities.length) {
      setError("Each priority needs to be different.");
      return;
    }
    setError(null);
    savePlan.mutate(priorities);
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div key={index}>
            <label htmlFor={`weekly-priority-${index}`} className="mb-1.5 block text-xs font-medium text-muted">Priority {index + 1}</label>
            <Input
              id={`weekly-priority-${index}`}
              value={draft}
              maxLength={120}
              placeholder={index === 0 ? "What matters most?" : "Optional"}
              onChange={(event) => {
                setDrafts((current) => current.map((value, position) => position === index ? event.target.value : value));
                setError(null);
                savePlan.reset();
              }}
              className="h-10"
            />
          </div>
        ))}
      </div>
      {(error || savePlan.error) && <p role="alert" className="mt-3 text-xs text-[#a84e3d]">{error ?? savePlan.error?.message}</p>}
      {savePlan.isSuccess && !error && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#217347]"><Check size={14} />Plan saved</p>}
      <Button type="submit" size="sm" className="mt-4 w-full" disabled={unchanged || savePlan.isPending}>
        {savePlan.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
        Save plan
      </Button>
    </form>
  );
}

function ReviewContent({ report, latestWeekStart, onPlanSaved }: {
  report: WeeklyReview;
  latestWeekStart: string;
  onPlanSaved: () => void;
}) {
  const isLatest = report.weekStart === latestWeekStart;
  const days = report.days.map((day) => ({
    ...day,
    label: formatDate(day.date, { weekday: "short" }),
  }));
  const metrics = [
    { label: "Focus time", value: formatDuration(report.totals.focusMinutes), detail: "completed work" },
    { label: "Sessions", value: String(report.totals.completedSessions), detail: "completed" },
    { label: "Tasks done", value: String(report.totals.completedTasks), detail: "completed this week" },
    { label: "Goals met", value: `${report.totals.goalsMet}/7`, detail: "daily targets" },
  ];
  const delta = report.previousWeek.deltaMinutes;

  return (
    <>
      <section className="grid grid-cols-2 gap-y-5 border-y border-border py-5 md:grid-cols-4" aria-label="Weekly totals">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={`min-w-0 px-4 first:pl-0 md:px-6 md:first:pl-0 ${index % 2 === 1 ? "border-l border-border" : ""} ${index === 2 ? "md:border-l md:border-border" : ""}`}>
            <p className="text-xs font-medium text-muted">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p>
            <p className="mt-0.5 text-xs text-muted">{metric.detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-lg border border-black/[0.05] bg-white p-5 shadow-[0_8px_28px_rgba(24,30,24,0.025)]" aria-labelledby="weekly-chart-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="weekly-chart-heading" className="text-sm font-semibold">Focus by day</h2>
                <p className="mt-1 text-xs text-muted">Completed focus time, in your account timezone</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${delta < 0 ? "text-[#b75e4e]" : "text-[#217347]"}`}>
                {delta < 0 ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                {delta >= 0 ? "+" : ""}{formatDuration(delta)} vs previous week
              </div>
            </div>
            {report.totals.focusMinutes > 0 ? (
              <div className="mt-6 h-[240px] w-full" role="img" aria-label={`Focused minutes by day: ${days.map((day) => `${day.label} ${day.focusMinutes} minutes`).join(", ")}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#edf0eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6f7771", fontSize: 11 }} dy={7} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#6f7771", fontSize: 11 }} tickFormatter={(value: number) => `${value}m`} width={42} />
                    <Tooltip cursor={{ fill: "rgba(31,122,80,0.06)" }} contentStyle={{ border: "1px solid #dde1dc", borderRadius: 6, fontSize: 12 }} formatter={(value) => [`${value} min`, "Focus"]} />
                    <Bar dataKey="focusMinutes" fill="#1f7a50" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-6 flex h-[240px] flex-col items-center justify-center border-t border-border text-center">
                <Clock3 size={22} className="text-muted" />
                <p className="mt-3 text-sm font-medium">No focus time recorded</p>
                <p className="mt-1 text-xs text-muted">Completed sessions will appear here.</p>
              </div>
            )}
          </section>

          <section className="border-t border-border pt-5" aria-labelledby="daily-breakdown-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="daily-breakdown-heading" className="text-sm font-semibold">Daily breakdown</h2>
              <span className="text-xs text-muted">Monday to Sunday</span>
            </div>
            <div className="mt-4 divide-y divide-border">
              {days.map((day) => (
                <div key={day.date} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[minmax(0,1.4fr)_90px_110px_90px_80px]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDate(day.date, { weekday: "long", month: "short", day: "numeric" })}</p>
                    <p className="text-[11px] text-muted sm:hidden">{countLabel(day.completedSessions, "session")} / {countLabel(day.completedTasks, "task")}</p>
                  </div>
                  <p className="text-right text-sm font-semibold tabular-nums sm:text-left">{formatDuration(day.focusMinutes)}</p>
                  <p className={`col-span-2 text-xs sm:col-span-1 ${day.goalMet ? "text-[#217347]" : "text-muted"}`}>
                    {day.targetMinutes === null ? "No goal" : day.goalMet ? <span className="inline-flex items-center gap-1"><Check size={13} />Goal met</span> : `${day.focusMinutes} / ${day.targetMinutes} min goal`}
                  </p>
                  <p className="hidden text-xs text-muted tabular-nums sm:block">{countLabel(day.completedSessions, "session")}</p>
                  <p className="hidden text-xs text-muted tabular-nums sm:block">{countLabel(day.completedTasks, "task")}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="border-t border-border pt-5" aria-labelledby="week-highlights-heading">
            <h2 id="week-highlights-heading" className="text-sm font-semibold">Week highlights</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div><p className="text-xs text-muted">Best day</p><p className="mt-1 font-semibold">{report.bestDay ? `${formatDate(report.bestDay.date, { weekday: "long" })} / ${formatDuration(report.bestDay.focusMinutes)}` : "No focus time yet"}</p></div>
              <div className="border-t border-border pt-4"><p className="text-xs text-muted">Previous week</p><p className="mt-1 font-semibold tabular-nums">{formatDuration(report.previousWeek.focusMinutes)}</p></div>
              <div className="border-t border-border pt-4"><p className="text-xs text-muted">Interrupted sessions</p><p className="mt-1 font-semibold tabular-nums">{report.totals.cancelledSessions + report.totals.expiredSessions}<span className="ml-1 text-xs font-normal text-muted">cancelled or expired</span></p></div>
            </div>
          </section>

          <section className="rounded-lg border border-black/[0.05] bg-white p-5 shadow-[0_8px_28px_rgba(24,30,24,0.025)]" aria-labelledby="weekly-plan-heading">
            <h2 id="weekly-plan-heading" className="text-sm font-semibold">Plan for {formatDate(report.nextWeekPlan.weekStart, { month: "short", day: "numeric" })}</h2>
            <p className="mt-1 mb-5 text-xs text-muted">Up to three priorities for the week</p>
            {isLatest ? (
              <WeeklyPlanEditor key={report.nextWeekPlan.weekStart} plan={report.nextWeekPlan} onSaved={onPlanSaved} />
            ) : report.nextWeekPlan.priorities.length ? (
              <ol className="space-y-3">
                {report.nextWeekPlan.priorities.map((priority, index) => <li key={index} className="flex gap-3 text-sm"><span className="text-muted tabular-nums">0{index + 1}</span><span className="min-w-0 break-words font-medium">{priority}</span></li>)}
              </ol>
            ) : (
              <p className="text-sm text-muted">No priorities saved for this week.</p>
            )}
          </section>

          {isLatest && <Button asChild variant="secondary" className="w-full"><Link href="/focus">Start a focus session <ArrowRight size={16} /></Link></Button>}
        </aside>
      </div>
    </>
  );
}

export function WeeklyReviewScreen() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const latestQuery = useQuery({
    queryKey: ["weekly-review", "latest"],
    queryFn: () => apiRequest<WeeklyReview>("/api/backend/reports/weekly"),
  });
  const historicalQuery = useQuery({
    queryKey: ["weekly-review", selectedWeek],
    queryFn: () => apiRequest<WeeklyReview>(`/api/backend/reports/weekly?weekStart=${encodeURIComponent(selectedWeek ?? "")}`),
    enabled: selectedWeek !== null,
  });
  const activeQuery = selectedWeek === null ? latestQuery : historicalQuery;
  const report = activeQuery.data;
  const latestWeekStart = latestQuery.data?.weekStart;
  const earliestWeekStart = latestWeekStart ? addDays(latestWeekStart, -52 * 7) : null;

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-10 md:px-8 lg:px-10">
      <header className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted">Your progress</p>
          <h1 className="mt-1 text-2xl font-semibold">Weekly review</h1>
          <p className="mt-1 text-sm text-muted">{report ? weekRange(report) : "Completed weeks, Monday to Sunday"}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto" aria-label="Choose review week">
          <Button variant="secondary" size="icon" aria-label="Previous week" title="Previous week" disabled={!report || !earliestWeekStart || report.weekStart <= earliestWeekStart} onClick={() => report && setSelectedWeek(addDays(report.weekStart, -7))}><ChevronLeft size={18} /></Button>
          <span className="min-w-28 text-center text-xs font-medium text-muted">{report?.weekStart === latestWeekStart ? "Last full week" : "Past week"}</span>
          <Button variant="secondary" size="icon" aria-label="Next week" title="Next week" disabled={!report || !latestWeekStart || report.weekStart >= latestWeekStart} onClick={() => report && latestWeekStart && setSelectedWeek(addDays(report.weekStart, 7) === latestWeekStart ? null : addDays(report.weekStart, 7))}><ChevronRight size={18} /></Button>
        </div>
      </header>

      {activeQuery.isPending && <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted"><LoaderCircle size={18} className="animate-spin" />Loading weekly review</div>}
      {activeQuery.isError && !report && <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><p role="alert" className="text-sm text-muted">Weekly review could not be loaded.</p><Button variant="secondary" onClick={() => activeQuery.refetch()}><RotateCcw size={16} />Try again</Button></div>}
      {report && latestWeekStart && <ReviewContent report={report} latestWeekStart={latestWeekStart} onPlanSaved={() => void queryClient.invalidateQueries({ queryKey: ["weekly-review", "latest"] })} />}
      {activeQuery.isError && report && <p role="alert" className="mt-4 text-xs text-[#a84e3d]">Showing the last available report. <button type="button" className="underline" onClick={() => activeQuery.refetch()}>Retry</button></p>}
    </div>
  );
}
