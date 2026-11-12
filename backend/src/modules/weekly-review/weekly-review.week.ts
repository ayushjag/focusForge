import { AppError } from "../../shared/errors/app-error.js";
import { addDays, createDayKeyFormatter } from "../../shared/time/focus-time.js";

export const mondayOfWeek = (dateKey: string): string => {
  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return addDays(dateKey, -((weekday + 6) % 7));
};

export const completedWeekStart = (now: Date, timezone: string): string =>
  addDays(mondayOfWeek(createDayKeyFormatter(timezone)(now)), -7);

export const resolveReportWeekStart = (
  now: Date,
  timezone: string,
  requested?: string,
): string => {
  const latest = completedWeekStart(now, timezone);
  if (requested === undefined) return latest;

  const parsed = new Date(`${requested}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(requested) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== requested ||
    parsed.getUTCDay() !== 1 ||
    requested < addDays(latest, -52 * 7) ||
    requested > latest
  ) {
    throw new AppError("Choose a completed Monday-Sunday week from the last 52 weeks", 400, "INVALID_WEEK_START");
  }

  return requested;
};

export const validatePlanWeek = (now: Date, timezone: string, weekStart: string): void => {
  const current = addDays(completedWeekStart(now, timezone), 7);
  if (weekStart !== current) {
    throw new AppError("Priorities can be changed only for the current week", 400, "INVALID_PLAN_WEEK");
  }
};

export const normalizePriorities = (priorities: string[]): string[] => {
  const cleaned = priorities.map((priority) => priority.trim());
  if (
    cleaned.length > 3 ||
    cleaned.some((priority) => priority.length < 1 || priority.length > 120) ||
    new Set(cleaned.map((priority) => priority.toLocaleLowerCase())).size !== cleaned.length
  ) {
    throw new AppError("Choose up to three distinct priorities of 1-120 characters", 400, "INVALID_PRIORITIES");
  }
  return cleaned;
};
