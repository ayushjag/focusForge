import { SessionStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { addDays, createDayKeyFormatter } from "../../shared/time/focus-time.js";
import { buildDailyGoalSummary } from "./daily-goal.summary.js";

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

export const getDailyGoal = async (userId: string, days = 14) => {
  const timezone = await getUserTimezone(userId);
  const now = new Date();
  const targets = await prisma.dailyGoalTarget.findMany({
    where: { userId },
    select: { effectiveDate: true, targetMinutes: true },
    orderBy: { effectiveDate: "asc" },
  });
  const firstHistoryDate = addDays(createDayKeyFormatter(timezone)(now), 1 - days);
  const firstDate = targets[0] && targets[0].effectiveDate < firstHistoryDate
    ? targets[0].effectiveDate
    : firstHistoryDate;
  const earliestPossibleEnd = new Date(Date.parse(`${firstDate}T00:00:00.000Z`) - 2 * 86_400_000);
  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: SessionStatus.COMPLETED,
      actualEnd: { gte: earliestPossibleEnd, lte: now },
      actualStart: { lte: now },
    },
    select: { status: true, actualStart: true, actualEnd: true },
  });

  return buildDailyGoalSummary({ now, timezone, targets, sessions, days });
};

export const setDailyGoal = async (userId: string, targetMinutes: number) => {
  const timezone = await getUserTimezone(userId);
  const effectiveDate = createDayKeyFormatter(timezone)(new Date());
  await prisma.dailyGoalTarget.upsert({
    where: { userId_effectiveDate: { userId, effectiveDate } },
    create: { userId, effectiveDate, targetMinutes },
    update: { targetMinutes },
  });
  return getDailyGoal(userId);
};
