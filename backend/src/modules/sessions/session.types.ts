import type { SessionStatus } from "@prisma/client";

export type StartSessionBody = {
  taskId: string;
  durationMinutes: number;
};

export type SessionParams = {
  id: string;
};

export type SessionListQuery = {
  status?: SessionStatus;
};
