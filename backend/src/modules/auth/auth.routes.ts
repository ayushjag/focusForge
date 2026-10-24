import type { FastifyInstance } from "fastify";
import { getMe, login, register } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { requireAuth } from "../../shared/http/require-auth.js";

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/auth/register", { schema: { body: registerSchema } }, register);
  app.post("/api/auth/login", { schema: { body: loginSchema } }, login);
  app.get("/api/auth/me", { preHandler: requireAuth }, getMe);
};
