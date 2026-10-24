import type { FastifyInstance } from "fastify";
import { getHealth } from "./health.controller.js";

export const registerHealthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/health", getHealth);
};
