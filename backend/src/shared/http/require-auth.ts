import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";

export const requireAuth = async (request: FastifyRequest): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError("A valid access token is required", 401, "UNAUTHORIZED");
  }
};
