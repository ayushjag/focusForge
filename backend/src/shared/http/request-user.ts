import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export const getRequestUserId = (request: FastifyRequest): string => {
  const userId = request.user?.id;

  if (!userId) {
    throw new AppError("A valid access token is required", 401, "UNAUTHORIZED");
  }

  return userId;
};
