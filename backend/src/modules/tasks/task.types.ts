import type { TaskPriority, TaskStatus } from "@prisma/client";

export type CreateTaskBody = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
};

export type UpdateTaskBody = Partial<CreateTaskBody>;

export type TaskParams = {
  id: string;
};

export type TaskListQuery = {
  status?: TaskStatus;
};
