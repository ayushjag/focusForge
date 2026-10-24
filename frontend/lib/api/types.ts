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
