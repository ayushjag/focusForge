import type { FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import { getWeeklyReview, setWeeklyPlan } from "./weekly-review.service.js";
import type { WeeklyPlanBody, WeeklyReviewQuery } from "./weekly-review.types.js";

export const getWeeklyReviewForUser = async (
  request: FastifyRequest<{ Querystring: WeeklyReviewQuery }>,
) => ({ success: true, data: await getWeeklyReview(getRequestUserId(request), request.query.weekStart) });

export const putWeeklyPlanForUser = async (
  request: FastifyRequest<{ Body: WeeklyPlanBody }>,
) => ({
  success: true,
  data: await setWeeklyPlan(
    getRequestUserId(request), request.body.weekStart, request.body.priorities,
  ),
});
