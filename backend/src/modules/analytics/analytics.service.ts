import { TaskStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { expireElapsedSession } from "../sessions/session.service.js";
import { buildAnalyticsSummary, createDayKeyFormatter } from "./analytics.summary.js";

export const getAnalyticsSummary = async (userId: string, requestedTimezone?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const timezone = requestedTimezone ?? user.timezone;
  try {
    createDayKeyFormatter(timezone)(new Date());
  } catch {
    throw new AppError("Enter a valid IANA timezone", 400, "INVALID_TIMEZONE");
  }

  await expireElapsedSession(userId);
  const now = new Date();
  const [sessions, totalTasks, completedTasks, missedTasks] = await prisma.$transaction([
    prisma.focusSession.findMany({
      where: {
        userId,
        actualStart: { gte: new Date(now.getTime() - 8 * 86_400_000), lte: now },
      },
      select: { actualStart: true, actualEnd: true, status: true },
    }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: TaskStatus.COMPLETED } }),
    prisma.task.count({ where: { userId, status: TaskStatus.MISSED } }),
  ]);

  return buildAnalyticsSummary({ now, timezone, sessions, totalTasks, completedTasks, missedTasks });
};
