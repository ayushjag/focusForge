import { addDays, createDayKeyFormatter, creditedMillisecondsByDay } from "../../shared/time/focus-time.js";
import type { WeeklySessionFact, WeeklyTargetFact, WeeklyTaskFact } from "./weekly-review.types.js";

type SummaryInput = {
  timezone: string;
  weekStart: string;
  sessions: WeeklySessionFact[];
  tasks: WeeklyTaskFact[];
  targets: WeeklyTargetFact[];
  priorities: string[];
};

export const buildWeeklyReview = ({
  timezone, weekStart, sessions, tasks, targets, priorities,
}: SummaryInput) => {
  const dayKey = createDayKeyFormatter(timezone);
  const credited = creditedMillisecondsByDay(sessions, timezone);
  const orderedTargets = [...targets].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: addDays(weekStart, index),
    focusMinutes: Math.round((credited.get(addDays(weekStart, index)) ?? 0) / 60_000),
    targetMinutes: null as number | null,
    goalMet: false,
    completedSessions: 0,
    cancelledSessions: 0,
    expiredSessions: 0,
    completedTasks: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  let targetIndex = 0;
  let targetMinutes: number | null = null;

  for (const day of days) {
    while (orderedTargets[targetIndex]?.effectiveDate <= day.date) {
      targetMinutes = orderedTargets[targetIndex].targetMinutes;
      targetIndex++;
    }
    day.targetMinutes = targetMinutes;
    day.goalMet = targetMinutes !== null && day.focusMinutes >= targetMinutes;
  }

  for (const session of sessions) {
    if (!session.actualEnd) continue;
    const day = byDate.get(dayKey(session.actualEnd));
    if (!day) continue;
    if (session.status === "COMPLETED") day.completedSessions++;
    if (session.status === "CANCELLED") day.cancelledSessions++;
    if (session.status === "EXPIRED") day.expiredSessions++;
  }

  for (const task of tasks) {
    if (task.status !== "COMPLETED" || !task.completedAt) continue;
    const day = byDate.get(dayKey(task.completedAt));
    if (day) day.completedTasks++;
  }

  const previousWeekStart = addDays(weekStart, -7);
  const previousWeekFocusMinutes = Array.from({ length: 7 }, (_, index) =>
    Math.round((credited.get(addDays(previousWeekStart, index)) ?? 0) / 60_000),
  ).reduce((sum, minutes) => sum + minutes, 0);
  const focusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const deltaMinutes = focusMinutes - previousWeekFocusMinutes;
  const bestDay = days.reduce<{ date: string; focusMinutes: number } | null>(
    (best, day) => day.focusMinutes > (best?.focusMinutes ?? 0)
      ? { date: day.date, focusMinutes: day.focusMinutes }
      : best,
    null,
  );

  return {
    timezone,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days,
    totals: {
      focusMinutes,
      completedSessions: days.reduce((sum, day) => sum + day.completedSessions, 0),
      cancelledSessions: days.reduce((sum, day) => sum + day.cancelledSessions, 0),
      expiredSessions: days.reduce((sum, day) => sum + day.expiredSessions, 0),
      completedTasks: days.reduce((sum, day) => sum + day.completedTasks, 0),
      goalsMet: days.reduce((sum, day) => sum + Number(day.goalMet), 0),
    },
    previousWeek: {
      focusMinutes: previousWeekFocusMinutes,
      deltaMinutes,
      changePercent: previousWeekFocusMinutes === 0
        ? null
        : Math.round((deltaMinutes / previousWeekFocusMinutes) * 100),
    },
    bestDay,
    nextWeekPlan: { weekStart: addDays(weekStart, 7), priorities },
  };
};
