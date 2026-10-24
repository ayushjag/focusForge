import type { SessionStatus } from "@prisma/client";

export type AnalyticsQuery = { timezone?: string };

export type SessionFact = {
  actualStart: Date;
  actualEnd: Date | null;
  status: SessionStatus;
};

export type DailyAnalytics = {
  date: string;
  focusMinutes: number;
  activeSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  expiredSessions: number;
};

export type AnalyticsSummary = {
  period: { from: string; through: string; timezone: string };
  focusMinutes: number;
  sessions: {
    active: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  tasks: { total: number; completed: number; missed: number; completionRate: number };
  daily: DailyAnalytics[];
};
