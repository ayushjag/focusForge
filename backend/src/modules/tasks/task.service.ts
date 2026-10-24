import type { TaskPriority, TaskStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { CreateTaskBody, UpdateTaskBody } from "./task.types.js";

const getUserOrThrow = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }
};

const getTaskOrThrow = async (userId: string, taskId: string) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new AppError("Task not found", 404, "TASK_NOT_FOUND");
  }

  return task;
};

const toDate = (value: string | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

const validateSchedule = (
  scheduledStart: Date | null | undefined,
  scheduledEnd: Date | null | undefined,
): void => {
  if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
    throw new AppError(
      "scheduledEnd must be later than scheduledStart",
      400,
      "INVALID_SCHEDULE",
    );
  }
};

const normalizeTitle = (title: string): string => {
  const normalizedTitle = title.trim();

  if (!normalizedTitle) {
    throw new AppError("title cannot be empty", 400, "INVALID_TITLE");
  }

  return normalizedTitle;
};

export const createTask = async (userId: string, input: CreateTaskBody) => {
  await getUserOrThrow(userId);

  const scheduledStart = toDate(input.scheduledStart);
  const scheduledEnd = toDate(input.scheduledEnd);
  validateSchedule(scheduledStart, scheduledEnd);

  return prisma.task.create({
    data: {
      userId,
      title: normalizeTitle(input.title),
      description: input.description?.trim() || null,
      priority: input.priority ?? "MEDIUM",
      status: input.status ?? (scheduledStart ? "SCHEDULED" : "PENDING"),
      scheduledStart,
      scheduledEnd,
    },
  });
};

export const listTasks = async (userId: string, status?: TaskStatus) => {
  await getUserOrThrow(userId);

  return prisma.task.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
  });
};

export const getTaskById = async (userId: string, taskId: string) =>
  getTaskOrThrow(userId, taskId);

export const updateTask = async (
  userId: string,
  taskId: string,
  input: UpdateTaskBody,
) => {
  const task = await getTaskOrThrow(userId, taskId);
  const scheduledStart =
    input.scheduledStart === undefined
      ? task.scheduledStart
      : toDate(input.scheduledStart);
  const scheduledEnd =
    input.scheduledEnd === undefined ? task.scheduledEnd : toDate(input.scheduledEnd);
  validateSchedule(scheduledStart, scheduledEnd);

  return prisma.task.update({
    where: { id: task.id },
    data: {
      ...(input.title !== undefined ? { title: normalizeTitle(input.title) } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {}),
      ...(input.priority !== undefined
        ? { priority: input.priority as TaskPriority }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.scheduledStart !== undefined ? { scheduledStart } : {}),
      ...(input.scheduledEnd !== undefined ? { scheduledEnd } : {}),
    },
  });
};

export const deleteTask = async (userId: string, taskId: string) => {
  const task = await getTaskOrThrow(userId, taskId);
  await prisma.task.delete({ where: { id: task.id } });
};
