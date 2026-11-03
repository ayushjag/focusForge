import type { AnalyticsSummary, DailyAnalytics, SessionFact } from "./analytics.types.js";
import { createDayKeyFormatter, creditedMillisecondsByDay } from "../../shared/time/focus-time.js";

type SummaryInput = {
  now: Date;
  timezone: string;
  sessions: SessionFact[];
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
};

export const buildAnalyticsSummary = ({
  now,
  timezone,
  sessions,
  totalTasks,
  completedTasks,
  missedTasks,
}: SummaryInput): AnalyticsSummary => {
  const dayKey = createDayKeyFormatter(timezone);
  const todayUtc = Date.parse(`${dayKey(now)}T00:00:00.000Z`);
  const daily: DailyAnalytics[] = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(todayUtc - (6 - index) * 86_400_000).toISOString().slice(0, 10),
    focusMinutes: 0,
    activeSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    expiredSessions: 0,
  }));
  const daysByKey = new Map(daily.map((day) => [day.date, day]));
  const millisecondsByKey = creditedMillisecondsByDay(sessions, timezone);

  for (const session of sessions) {
    const key = dayKey(session.actualStart);
    const day = daysByKey.get(key);
    if (!day) continue;

    switch (session.status) {
      case "ACTIVE":
        day.activeSessions++;
        break;
      case "COMPLETED":
        day.completedSessions++;
        break;
      case "CANCELLED":
        day.cancelledSessions++;
        break;
      case "EXPIRED":
        day.expiredSessions++;
        break;
    }
  }

  for (const day of daily) {
    day.focusMinutes = Math.round((millisecondsByKey.get(day.date) ?? 0) / 60_000);
  }

  return {
    period: { from: daily[0].date, through: daily[6].date, timezone },
    focusMinutes: daily.reduce((total, day) => total + day.focusMinutes, 0),
    sessions: {
      active: daily.reduce((total, day) => total + day.activeSessions, 0),
      completed: daily.reduce((total, day) => total + day.completedSessions, 0),
      cancelled: daily.reduce((total, day) => total + day.cancelledSessions, 0),
      expired: daily.reduce((total, day) => total + day.expiredSessions, 0),
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      missed: missedTasks,
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    daily,
  };
};
