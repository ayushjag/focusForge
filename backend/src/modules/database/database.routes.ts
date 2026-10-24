import type { FastifyInstance } from "fastify";
import {
  getDatabaseHealth,
  getDatabaseSchemaHealth,
} from "./database.controller.js";

export const registerDatabaseRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/health/database", getDatabaseHealth);
  app.get("/api/health/database/schema", getDatabaseSchemaHealth);
};
