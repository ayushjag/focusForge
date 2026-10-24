import type { FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import { getAnalyticsSummary } from "./analytics.service.js";
import type { AnalyticsQuery } from "./analytics.types.js";

export const getSummary = async (request: FastifyRequest<{ Querystring: AnalyticsQuery }>) => {
  const summary = await getAnalyticsSummary(getRequestUserId(request), request.query.timezone);
  return { success: true, data: summary };
};
