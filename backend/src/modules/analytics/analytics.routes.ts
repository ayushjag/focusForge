import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/http/require-auth.js";
import { getSummary } from "./analytics.controller.js";
import { analyticsQuerySchema } from "./analytics.schema.js";
import type { AnalyticsQuery } from "./analytics.types.js";

export const registerAnalyticsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Querystring: AnalyticsQuery }>(
    "/api/analytics/summary",
    { preHandler: requireAuth, schema: { querystring: analyticsQuerySchema } },
    getSummary,
  );
};
