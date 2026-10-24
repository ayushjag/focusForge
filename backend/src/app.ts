import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { env } from "./config/env.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerAnalyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { registerBlockedWebsiteRoutes } from "./modules/blocked-websites/blocked-website.routes.js";
import { registerDatabaseRoutes } from "./modules/database/database.routes.js";
import { registerExtensionRoutes } from "./modules/extension/extension.routes.js";
import { registerHealthRoutes } from "./modules/health/health.routes.js";
import { registerSessionRoutes } from "./modules/sessions/session.routes.js";
import { registerTaskRoutes } from "./modules/tasks/task.routes.js";

const app = Fastify({
  logger: true,
});

registerErrorHandler(app);
await app.register(fastifyJwt, {
  secret: env.jwtSecret,
  sign: { expiresIn: "1h" },
});
app.register(registerHealthRoutes);
app.register(registerDatabaseRoutes);
app.register(registerAuthRoutes);
app.register(registerAnalyticsRoutes);
app.register(registerTaskRoutes);
app.register(registerSessionRoutes);
app.register(registerBlockedWebsiteRoutes);
app.register(registerExtensionRoutes);

export default app;
