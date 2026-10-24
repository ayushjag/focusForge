import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/http/require-auth.js";
import { getBlockingState } from "./extension.controller.js";

export const registerExtensionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    "/api/extension/blocking-state",
    { preHandler: requireAuth },
    getBlockingState,
  );
};
