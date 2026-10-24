import type { FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import { getBlockingState as getBlockingStateForUser } from "./extension.service.js";

export const getBlockingState = async (request: FastifyRequest) => {
  const blockingState = await getBlockingStateForUser(getRequestUserId(request));
  return { success: true, data: blockingState };
};
