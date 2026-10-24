const taskPriorities = ["LOW", "MEDIUM", "HIGH"];
const taskStatuses = ["PENDING", "SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"];

const taskProperties = {
  title: { type: "string", minLength: 1, maxLength: 120 },
  description: { type: "string", maxLength: 2000 },
  priority: { type: "string", enum: taskPriorities },
  status: { type: "string", enum: taskStatuses },
  scheduledStart: { type: "string", format: "date-time" },
  scheduledEnd: { type: "string", format: "date-time" },
} as const;

export const createTaskSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: taskProperties,
} as const;

export const updateTaskSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: taskProperties,
} as const;

export const taskIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
} as const;

export const listTasksQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: taskStatuses },
  },
} as const;
