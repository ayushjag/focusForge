const sessionStatuses = ["ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"];

export const startSessionSchema = {
  type: "object",
  required: ["taskId", "durationMinutes"],
  additionalProperties: false,
  properties: {
    taskId: { type: "string", minLength: 1 },
    durationMinutes: { type: "integer", minimum: 1, maximum: 480 },
  },
} as const;

export const sessionIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
} as const;

export const listSessionsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: sessionStatuses },
  },
} as const;
