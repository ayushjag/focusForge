import { SessionStatus, TaskStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { addDays, createDayKeyFormatter } from "../../shared/time/focus-time.js";
import { expireElapsedSession } from "../sessions/session.service.js";
import { buildWeeklyReview } from "./weekly-review.summary.js";
import { normalizePriorities, resolveReportWeekStart, validatePlanWeek } from "./weekly-review.week.js";

const getUserTimezone = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  try {
    createDayKeyFormatter(user.timezone)(new Date());
  } catch {
    throw new AppError("Your account needs a valid IANA timezone", 400, "INVALID_TIMEZONE");
  }
  return user.timezone;
};

export const getWeeklyReview = async (userId: string, requestedWeek?: string) => {
  const timezone = await getUserTimezone(userId);
  const weekStart = resolveReportWeekStart(new Date(), timezone, requestedWeek);
  const previousStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);
  const lower = new Date(Date.parse(`${previousStart}T00:00:00.000Z`) - 2 * 86_400_000);
  const upper = new Date(Date.parse(`${nextWeekStart}T00:00:00.000Z`) + 2 * 86_400_000);
  await expireElapsedSession(userId);

  const [sessions, tasks, targets, plan] = await Promise.all([
    prisma.focusSession.findMany({
      where: {
        userId,
        status: { in: [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.EXPIRED] },
        actualEnd: { gte: lower, lt: upper },
        actualStart: { lt: upper },
      },
      select: { status: true, actualStart: true, actualEnd: true },
    }),
    prisma.task.findMany({
      where: { userId, status: TaskStatus.COMPLETED, completedAt: { gte: lower, lt: upper } },
      select: { status: true, completedAt: true },
    }),
    prisma.dailyGoalTarget.findMany({
      where: { userId, effectiveDate: { lte: addDays(weekStart, 6) } },
      select: { effectiveDate: true, targetMinutes: true },
    }),
    prisma.weeklyPlan.findUnique({
      where: { userId_weekStart: { userId, weekStart: nextWeekStart } },
      select: { priorities: true },
    }),
  ]);

  return buildWeeklyReview({
    timezone, weekStart, sessions, tasks, targets, priorities: plan?.priorities ?? [],
  });
};

export const setWeeklyPlan = async (userId: string, weekStart: string, priorities: string[]) => {
  const timezone = await getUserTimezone(userId);
  validatePlanWeek(new Date(), timezone, weekStart);
  const normalized = normalizePriorities(priorities);
  const plan = await prisma.weeklyPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, priorities: normalized },
    update: { priorities: normalized },
    select: { weekStart: true, priorities: true },
  });
  return plan;
};
