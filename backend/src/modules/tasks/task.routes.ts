import type { FastifyInstance } from "fastify";
import {
  createTask,
  getTask,
  getTasks,
  removeTask,
  updateTask,
} from "./task.controller.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from "./task.schema.js";
import type {
  CreateTaskBody,
  TaskListQuery,
  TaskParams,
  UpdateTaskBody,
} from "./task.types.js";
import { requireAuth } from "../../shared/http/require-auth.js";

export const registerTaskRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post<{ Body: CreateTaskBody }>(
    "/api/tasks",
    { preHandler: requireAuth, schema: { body: createTaskSchema } },
    createTask,
  );
  app.get<{ Querystring: TaskListQuery }>(
    "/api/tasks",
    { preHandler: requireAuth, schema: { querystring: listTasksQuerySchema } },
    getTasks,
  );
  app.get<{ Params: TaskParams }>(
    "/api/tasks/:id",
    { preHandler: requireAuth, schema: { params: taskIdParamsSchema } },
    getTask,
  );
  app.patch<{ Params: TaskParams; Body: UpdateTaskBody }>(
    "/api/tasks/:id",
    { preHandler: requireAuth, schema: { params: taskIdParamsSchema, body: updateTaskSchema } },
    updateTask,
  );
  app.delete<{ Params: TaskParams }>(
    "/api/tasks/:id",
    { preHandler: requireAuth, schema: { params: taskIdParamsSchema } },
    removeTask,
  );
};
