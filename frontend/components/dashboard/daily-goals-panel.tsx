"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flame, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api/client";
import type { DailyGoalDay, DailyGoalSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const intensityClasses = [
  "bg-[#e9ede8]",
  "bg-[#d4eab3]",
  "bg-[#a6d77c]",
  "bg-[#69b96a]",
  "bg-[#2c8059]",
] as const;

function intensity(minutes: number) {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function dayLabel(days: number) {
  return days === 1 ? "day" : "days";
}

function ActivityGrid({ history, todayDate }: { history: DailyGoalDay[]; todayDate: string }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedDay = history.find((day) => day.date === selectedDate) ?? history.at(-1);
  const firstDate = history[0]?.date;
  const mondayOffset = firstDate
    ? (new Date(`${firstDate}T12:00:00Z`).getUTCDay() + 6) % 7
    : 0;

  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (scrollArea) scrollArea.scrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
  }, [history.length, todayDate]);

  return (
    <section className="min-w-0" aria-label="Study activity">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Study activity</h3>
        <span className="text-xs text-muted">Last 90 days</span>
      </div>
      <div ref={scrollRef} data-testid="activity-scroll" className="mt-4 overflow-x-auto pb-2" tabIndex={0} aria-label="Study activity calendar">
        <div className="flex min-w-max gap-2.5">
          <div className="grid grid-rows-7 gap-1 text-[10px] leading-[15px] text-muted lg:leading-[20px]" aria-hidden="true">
            {["M", "", "W", "", "F", "", ""].map((day, index) => <span key={index} className="h-[15px] lg:h-[20px]">{day}</span>)}
          </div>
          <div className="grid grid-flow-col grid-rows-[repeat(7,15px)] auto-cols-[15px] gap-1 lg:grid-rows-[repeat(7,20px)] lg:auto-cols-[20px]" role="group" aria-label="Daily focused minutes">
            {Array.from({ length: mondayOffset }, (_, index) => <span key={`padding-${index}`} aria-hidden="true" className="size-[15px] lg:size-[20px]" />)}
            {history.map((day) => {
              const label = `${formatDate(day.date, { weekday: "long", month: "short", day: "numeric" })}: ${day.focusMinutes} minutes studied${day.targetMinutes === null ? ", no daily goal" : day.achieved ? ", goal reached" : `, goal ${day.targetMinutes} minutes`}`;
              return (
                <button
                  key={day.date}
                  type="button"
                  data-date={day.date}
                  data-minutes={day.focusMinutes}
                  aria-label={label}
                  aria-pressed={selectedDay?.date === day.date}
                  title={label}
                  onMouseEnter={() => setSelectedDate(day.date)}
                  onFocus={() => setSelectedDate(day.date)}
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    "size-[15px] rounded-[3px] border border-transparent transition-[transform,box-shadow] hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1 lg:size-[20px]",
                    intensityClasses[intensity(day.focusMinutes)],
                    day.achieved && "border-[#245a3a]",
                    selectedDay?.date === day.date && "ring-2 ring-foreground ring-offset-1",
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex min-h-10 flex-col items-start gap-2 border-t border-border pt-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="min-w-0 text-muted" aria-live="polite">
          {selectedDay ? <><span className="font-semibold text-foreground">{formatDate(selectedDay.date, { month: "short", day: "numeric" })}</span> | {formatMinutes(selectedDay.focusMinutes)}{selectedDay.achieved ? " | Goal met" : selectedDay.targetMinutes !== null ? ` | ${selectedDay.targetMinutes} min target` : ""}{selectedDay.date === todayDate ? " | Today" : ""}</> : "No activity yet"}
        </p>
        <div className="flex shrink-0 items-center gap-1" aria-label="Color intensity: less to more study time">
          <span className="mr-1 text-muted">Less</span>
          {intensityClasses.map((shade, index) => <span key={index} className={cn("size-2.5 rounded-[2px]", shade)} />)}
          <span className="ml-1 text-muted">More</span>
        </div>
      </div>
    </section>
  );
}

export function DailyGoalsPanel() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const goalsQuery = useQuery({
    queryKey: ["goals", "daily", 90],
    queryFn: () => apiRequest<DailyGoalSummary>("/api/backend/goals/daily?days=90"),
    refetchInterval: 60_000,
  });
  const saveGoal = useMutation({
    mutationFn: (targetMinutes: number) => apiRequest<DailyGoalSummary>("/api/backend/goals/daily", {
      method: "PUT",
      body: JSON.stringify({ targetMinutes }),
    }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["goals", "daily"] });
    },
  });

  const goal = goalsQuery.data;
  const openEditor = () => {
    setDraftMinutes(goal?.today.targetMinutes?.toString() ?? "");
    setValidationError(null);
    saveGoal.reset();
    setEditing(true);
  };
  const submitGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = draftMinutes.trim();
    const targetMinutes = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(targetMinutes) || targetMinutes < 1 || targetMinutes > 480) {
      setValidationError("Choose a whole number from 1 to 480 minutes.");
      return;
    }
    setValidationError(null);
    saveGoal.mutate(targetMinutes);
  };

  return (
    <Card className="border border-black/[0.04] shadow-[0_8px_28px_rgba(24,30,24,0.035)]">
      <CardContent className="p-5">
        {goalsQuery.isPending && <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />Loading daily goals</div>}
        {goalsQuery.isError && !goal && <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-sm"><p role="alert" className="text-muted">Daily goals could not be loaded.</p><Button variant="secondary" size="sm" onClick={() => goalsQuery.refetch()}><RotateCcw size={15} />Try again</Button></div>}
        {goal && (
          <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)]">
            <section className="min-w-0 border-b border-border pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6" aria-label="Daily goal">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Daily goal</h2>
                {!editing && goal.today.targetMinutes !== null && <Button variant="ghost" size="icon" className="size-8" title="Edit daily goal" aria-label="Edit daily goal" onClick={openEditor}><Pencil size={15} /></Button>}
              </div>
              {editing ? (
                <form onSubmit={submitGoal} noValidate className="mt-4">
                  <label htmlFor="daily-goal-minutes" className="text-xs font-medium text-muted">Daily target (minutes)</label>
                  <Input id="daily-goal-minutes" type="number" min={1} max={480} step={1} value={draftMinutes} onChange={(event) => { setDraftMinutes(event.target.value); setValidationError(null); }} className="mt-2 h-10 max-w-48" autoFocus />
                  {(validationError || saveGoal.error) && <p role="alert" className="mt-2 text-xs text-[#a84e3d]">{validationError ?? saveGoal.error?.message}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button type="submit" size="sm" disabled={saveGoal.isPending}>{saveGoal.isPending ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}Save goal</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={saveGoal.isPending}>Cancel</Button>
                  </div>
                </form>
              ) : goal.today.targetMinutes === null ? (
                <div className="mt-4">
                  <p className="text-2xl font-semibold tabular-nums">{formatMinutes(goal.today.focusMinutes)}</p>
                  <p className="mt-1 text-xs text-muted">Focused today</p>
                  <Button size="sm" className="mt-5" onClick={openEditor}>Set daily goal</Button>
                </div>
              ) : (
                <>
                  <p className="mt-4 text-3xl font-semibold tabular-nums">{goal.today.focusMinutes}<span className="ml-1 text-base font-medium text-muted">/ {goal.today.targetMinutes} min</span></p>
                  <Progress value={goal.today.progressPercent ?? 0} aria-label="Daily goal progress" className="mt-3 h-2 bg-[#e8eee4] [&>div]:bg-[#64b856]" />
                  <p className="mt-2 text-xs text-muted">{goal.today.achieved ? "Today's goal reached" : `${goal.today.remainingMinutes} min to go`}</p>
                </>
              )}
              <div className="mt-5 flex gap-6 border-t border-border pt-4 text-xs">
                <div><p className="flex items-center gap-1.5 text-muted"><Flame size={14} />Current streak</p><p className="mt-1 text-lg font-semibold tabular-nums">{goal.currentStreak} <span className="text-xs font-medium text-muted">{dayLabel(goal.currentStreak)}</span></p></div>
                <div><p className="text-muted">Longest streak</p><p className="mt-1 text-lg font-semibold tabular-nums">{goal.longestStreak} <span className="text-xs font-medium text-muted">{dayLabel(goal.longestStreak)}</span></p></div>
              </div>
            </section>
            <ActivityGrid history={goal.history} todayDate={goal.today.date} />
          </div>
        )}
        {goalsQuery.isError && goal && <p role="alert" className="mt-3 text-xs text-[#a84e3d]">Showing the last available goals. <button type="button" className="underline" onClick={() => goalsQuery.refetch()}>Retry</button></p>}
      </CardContent>
    </Card>
  );
}
