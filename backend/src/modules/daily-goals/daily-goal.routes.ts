import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/http/require-auth.js";
import { getDailyGoalForUser, putDailyGoalForUser } from "./daily-goal.controller.js";
import { dailyGoalBodySchema, dailyGoalQuerySchema } from "./daily-goal.schema.js";
import type { DailyGoalBody, DailyGoalQuery } from "./daily-goal.types.js";

export const registerDailyGoalRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get<{ Querystring: DailyGoalQuery }>(
    "/api/goals/daily",
    { preHandler: requireAuth, schema: { querystring: dailyGoalQuerySchema } },
    getDailyGoalForUser,
  );
  app.put<{ Body: DailyGoalBody }>(
    "/api/goals/daily",
    { preHandler: requireAuth, schema: { body: dailyGoalBodySchema } },
    putDailyGoalForUser,
  );
};
