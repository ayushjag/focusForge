import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import {
  createTask as createTaskForUser,
  deleteTask as deleteTaskForUser,
  getTaskById,
  listTasks,
  updateTask as updateTaskForUser,
} from "./task.service.js";
import type {
  CreateTaskBody,
  TaskListQuery,
  TaskParams,
  UpdateTaskBody,
} from "./task.types.js";

export const createTask = async (
  request: FastifyRequest<{ Body: CreateTaskBody }>,
  reply: FastifyReply,
) => {
  const task = await createTaskForUser(getRequestUserId(request), request.body);

  return reply.status(201).send({ success: true, data: task });
};

export const getTasks = async (
  request: FastifyRequest<{ Querystring: TaskListQuery }>,
) => {
  const tasks = await listTasks(getRequestUserId(request), request.query.status);

  return { success: true, data: tasks };
};

export const getTask = async (
  request: FastifyRequest<{ Params: TaskParams }>,
) => {
  const task = await getTaskById(getRequestUserId(request), request.params.id);

  return { success: true, data: task };
};

export const updateTask = async (
  request: FastifyRequest<{ Params: TaskParams; Body: UpdateTaskBody }>,
) => {
  const task = await updateTaskForUser(
    getRequestUserId(request),
    request.params.id,
    request.body,
  );

  return { success: true, data: task };
};

export const removeTask = async (
  request: FastifyRequest<{ Params: TaskParams }>,
) => {
  await deleteTaskForUser(getRequestUserId(request), request.params.id);

  return { success: true, message: "Task deleted" };
};
