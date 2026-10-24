import { Prisma, SessionStatus, TaskStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const getTaskForSessionOrThrow = async (userId: string, taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
    throw new AppError(
      "A completed or cancelled task cannot start a focus session",
      409,
      "TASK_NOT_AVAILABLE",
    );
  }

  return task;
};

const getSessionOrThrow = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId },
    include: { task: true },
  });

  if (!session) {
    throw new AppError("Focus session not found", 404, "SESSION_NOT_FOUND");
  }

  return session;
};

export const expireElapsedSession = async (userId: string) => {
  const now = new Date();
  const elapsedSession = await prisma.focusSession.findFirst({
    where: {
      userId,
      status: SessionStatus.ACTIVE,
      plannedEnd: { lte: now },
    },
  });

  if (!elapsedSession) {
    return null;
  }

  const result = await prisma.focusSession.updateMany({
    where: { id: elapsedSession.id, status: SessionStatus.ACTIVE },
    data: {
      status: SessionStatus.EXPIRED,
      actualEnd: elapsedSession.plannedEnd,
    },
  });

  return result.count === 1 ? elapsedSession.id : null;
};

const getActiveSessionOrThrow = async (userId: string, sessionId: string) => {
  await expireElapsedSession(userId);
  const session = await getSessionOrThrow(userId, sessionId);

  if (session.status !== SessionStatus.ACTIVE) {
    throw new AppError(
      "Focus session is no longer active",
      409,
      "SESSION_NOT_ACTIVE",
    );
  }

  return session;
};

export const startSession = async (
  userId: string,
  taskId: string,
  durationMinutes: number,
) => {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 480) {
    throw new AppError(
      "durationMinutes must be an integer between 1 and 480",
      400,
      "INVALID_SESSION_DURATION",
    );
  }

  await getTaskForSessionOrThrow(userId, taskId);
  await expireElapsedSession(userId);

  const activeSession = await prisma.focusSession.findFirst({
    where: { userId, status: SessionStatus.ACTIVE },
  });

  if (activeSession) {
    throw new AppError(
      "Complete or cancel the current focus session before starting another",
      409,
      "ACTIVE_SESSION_EXISTS",
    );
  }

  try {
    const actualStart = new Date();
    const plannedEnd = new Date(actualStart.getTime() + durationMinutes * 60_000);

    return await prisma.focusSession.create({
      data: {
        userId,
        taskId,
        plannedDurationMinutes: durationMinutes,
        plannedEnd,
        actualStart,
        status: SessionStatus.ACTIVE,
      },
      include: { task: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "Complete or cancel the current focus session before starting another",
        409,
        "ACTIVE_SESSION_EXISTS",
      );
    }

    throw error;
  }
};

export const listSessions = async (userId: string, status?: SessionStatus) => {
  await expireElapsedSession(userId);

  return prisma.focusSession.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { task: true },
    orderBy: { actualStart: "desc" },
  });
};

export const getActiveSession = async (userId: string) => {
  await expireElapsedSession(userId);

  return prisma.focusSession.findFirst({
    where: { userId, status: SessionStatus.ACTIVE },
    include: { task: true },
  });
};

export const completeSession = async (userId: string, sessionId: string) => {
  const session = await getActiveSessionOrThrow(userId, sessionId);

  return prisma.focusSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.COMPLETED, actualEnd: new Date() },
    include: { task: true },
  });
};

export const cancelSession = async (userId: string, sessionId: string) => {
  const session = await getActiveSessionOrThrow(userId, sessionId);

  return prisma.focusSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.CANCELLED, actualEnd: new Date() },
    include: { task: true },
  });
};
