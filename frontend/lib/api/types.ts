export type User = {
  id: string;
  email: string;
  timezone?: string;
  createdAt?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
};

export type FocusSession = {
  id: string;
  taskId: string;
  plannedDurationMinutes: number;
  plannedEnd: string;
  actualStart: string;
  actualEnd: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  task?: Task;
};

export type BlockedWebsite = {
  id: string;
  domain: string;
  enabled: boolean;
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
  daily: {
    date: string;
    focusMinutes: number;
    activeSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    expiredSessions: number;
  }[];
};

export type DailyGoalDay = {
  date: string;
  targetMinutes: number | null;
  focusMinutes: number;
  achieved: boolean;
};

export type DailyGoalSummary = {
  timezone: string;
  today: DailyGoalDay & {
    remainingMinutes: number | null;
    progressPercent: number | null;
  };
  currentStreak: number;
  longestStreak: number;
  history: DailyGoalDay[];
};

export type WeeklyReviewDay = {
  date: string;
  focusMinutes: number;
  targetMinutes: number | null;
  goalMet: boolean;
  completedSessions: number;
  cancelledSessions: number;
  expiredSessions: number;
  completedTasks: number;
};

export type WeeklyPlan = {
  weekStart: string;
  priorities: string[];
};

export type WeeklyReview = {
  timezone: string;
  weekStart: string;
  weekEnd: string;
  days: WeeklyReviewDay[];
  totals: {
    focusMinutes: number;
    completedSessions: number;
    cancelledSessions: number;
    expiredSessions: number;
    completedTasks: number;
    goalsMet: number;
  };
  previousWeek: {
    focusMinutes: number;
    deltaMinutes: number;
    changePercent: number | null;
  };
  bestDay: { date: string; focusMinutes: number } | null;
  nextWeekPlan: WeeklyPlan;
};
