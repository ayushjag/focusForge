import type { FastifyInstance } from "fastify";
import {
  cancelSession,
  completeSession,
  getCurrentSession,
  getSessions,
  startSession,
} from "./session.controller.js";
import {
  listSessionsQuerySchema,
  sessionIdParamsSchema,
  startSessionSchema,
} from "./session.schema.js";
import type {
  SessionListQuery,
  SessionParams,
  StartSessionBody,
} from "./session.types.js";
import { requireAuth } from "../../shared/http/require-auth.js";

export const registerSessionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post<{ Body: StartSessionBody }>(
    "/api/sessions/start",
    { preHandler: requireAuth, schema: { body: startSessionSchema } },
    startSession,
  );
  app.get<{ Querystring: SessionListQuery }>(
    "/api/sessions",
    { preHandler: requireAuth, schema: { querystring: listSessionsQuerySchema } },
    getSessions,
  );
  app.get("/api/sessions/active", { preHandler: requireAuth }, getCurrentSession);
  app.post<{ Params: SessionParams }>(
    "/api/sessions/:id/complete",
    { preHandler: requireAuth, schema: { params: sessionIdParamsSchema } },
    completeSession,
  );
  app.post<{ Params: SessionParams }>(
    "/api/sessions/:id/cancel",
    { preHandler: requireAuth, schema: { params: sessionIdParamsSchema } },
    cancelSession,
  );
};
