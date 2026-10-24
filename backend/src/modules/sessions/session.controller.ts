import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import {
  cancelSession as cancelSessionForUser,
  completeSession as completeSessionForUser,
  getActiveSession,
  listSessions,
  startSession as startSessionForUser,
} from "./session.service.js";
import type {
  SessionListQuery,
  SessionParams,
  StartSessionBody,
} from "./session.types.js";

export const startSession = async (
  request: FastifyRequest<{ Body: StartSessionBody }>,
  reply: FastifyReply,
) => {
  const session = await startSessionForUser(
    getRequestUserId(request),
    request.body.taskId,
    request.body.durationMinutes,
  );

  return reply.status(201).send({ success: true, data: session });
};

export const getSessions = async (
  request: FastifyRequest<{ Querystring: SessionListQuery }>,
) => {
  const sessions = await listSessions(getRequestUserId(request), request.query.status);

  return { success: true, data: sessions };
};

export const getCurrentSession = async (request: FastifyRequest) => {
  const session = await getActiveSession(getRequestUserId(request));

  return { success: true, data: session };
};

export const completeSession = async (
  request: FastifyRequest<{ Params: SessionParams }>,
) => {
  const session = await completeSessionForUser(
    getRequestUserId(request),
    request.params.id,
  );

  return { success: true, data: session };
};

export const cancelSession = async (
  request: FastifyRequest<{ Params: SessionParams }>,
) => {
  const session = await cancelSessionForUser(
    getRequestUserId(request),
    request.params.id,
  );

  return { success: true, data: session };
};
