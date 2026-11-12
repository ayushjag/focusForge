import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/http/require-auth.js";
import { getWeeklyReviewForUser, putWeeklyPlanForUser } from "./weekly-review.controller.js";
import { weeklyPlanBodySchema, weeklyReviewQuerySchema } from "./weekly-review.schema.js";
import type { WeeklyPlanBody, WeeklyReviewQuery } from "./weekly-review.types.js";

export const registerWeeklyReviewRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Querystring: WeeklyReviewQuery }>(
    "/api/reports/weekly",
    { preHandler: requireAuth, schema: { querystring: weeklyReviewQuerySchema } },
    getWeeklyReviewForUser,
  );
  app.put<{ Body: WeeklyPlanBody }>(
    "/api/reports/weekly/plan",
    { preHandler: requireAuth, schema: { body: weeklyPlanBodySchema } },
    putWeeklyPlanForUser,
  );
};
