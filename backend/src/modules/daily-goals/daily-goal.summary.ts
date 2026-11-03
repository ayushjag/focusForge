import { addDays, createDayKeyFormatter, creditedMillisecondsByDay } from "../../shared/time/focus-time.js";
import type { DailyGoalSessionFact, DailyGoalTargetFact } from "./daily-goal.types.js";

type SummaryInput = {
  now: Date;
  timezone: string;
  targets: DailyGoalTargetFact[];
  sessions: DailyGoalSessionFact[];
  days: number;
};

export const buildDailyGoalSummary = ({ now, timezone, targets, sessions, days }: SummaryInput) => {
  const today = createDayKeyFormatter(timezone)(now);
  const credited = creditedMillisecondsByDay(sessions, timezone);
  const orderedTargets = [...targets].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const firstHistoryDate = addDays(today, 1 - days);
  const firstDate = orderedTargets[0]?.effectiveDate < firstHistoryDate
    ? orderedTargets[0].effectiveDate
    : firstHistoryDate;
  const rows: {
    date: string;
    targetMinutes: number | null;
    focusMinutes: number;
    achieved: boolean;
  }[] = [];
  let targetIndex = 0;
  let targetMinutes: number | null = null;

  for (let date = firstDate; date <= today; date = addDays(date, 1)) {
    while (orderedTargets[targetIndex]?.effectiveDate <= date) {
      targetMinutes = orderedTargets[targetIndex].targetMinutes;
      targetIndex++;
    }
    const focusMinutes = Math.round((credited.get(date) ?? 0) / 60_000);
    rows.push({
      date,
      targetMinutes,
      focusMinutes,
      achieved: targetMinutes !== null && focusMinutes >= targetMinutes,
    });
  }

  let runningStreak = 0;
  let longestStreak = 0;
  let streakThroughYesterday = 0;
  for (const row of rows) {
    runningStreak = row.achieved ? runningStreak + 1 : 0;
    longestStreak = Math.max(longestStreak, runningStreak);
    if (row.date === addDays(today, -1)) streakThroughYesterday = runningStreak;
  }

  const todayRow = rows.at(-1)!;
  const currentStreak = todayRow.achieved ? runningStreak : streakThroughYesterday;
  return {
    timezone,
    today: {
      ...todayRow,
      remainingMinutes: todayRow.targetMinutes === null
        ? null
        : Math.max(0, todayRow.targetMinutes - todayRow.focusMinutes),
      progressPercent: todayRow.targetMinutes === null
        ? null
        : Math.min(100, Math.round((todayRow.focusMinutes / todayRow.targetMinutes) * 100)),
    },
    currentStreak,
    longestStreak,
    history: rows.filter((row) => row.date >= firstHistoryDate),
  };
};
