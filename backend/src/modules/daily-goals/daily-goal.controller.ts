import type { FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import { getDailyGoal, setDailyGoal } from "./daily-goal.service.js";
import type { DailyGoalBody, DailyGoalQuery } from "./daily-goal.types.js";

export const getDailyGoalForUser = async (
  request: FastifyRequest<{ Querystring: DailyGoalQuery }>,
) => ({ success: true, data: await getDailyGoal(getRequestUserId(request), request.query.days) });

export const putDailyGoalForUser = async (
  request: FastifyRequest<{ Body: DailyGoalBody }>,
) => ({ success: true, data: await setDailyGoal(getRequestUserId(request), request.body.targetMinutes) });
