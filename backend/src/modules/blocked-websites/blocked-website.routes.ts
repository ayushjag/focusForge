import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../shared/http/require-auth.js";
import {
  createBlockedWebsite,
  getBlockedWebsites,
  removeBlockedWebsite,
  updateBlockedWebsite,
} from "./blocked-website.controller.js";
import {
  blockedWebsiteIdParamsSchema,
  createBlockedWebsiteSchema,
  updateBlockedWebsiteSchema,
} from "./blocked-website.schema.js";
import type {
  BlockedWebsiteParams,
  CreateBlockedWebsiteBody,
  UpdateBlockedWebsiteBody,
} from "./blocked-website.types.js";

export const registerBlockedWebsiteRoutes = async (
  app: FastifyInstance,
): Promise<void> => {
  app.post<{ Body: CreateBlockedWebsiteBody }>(
    "/api/blocked-websites",
    { preHandler: requireAuth, schema: { body: createBlockedWebsiteSchema } },
    createBlockedWebsite,
  );
  app.get(
    "/api/blocked-websites",
    { preHandler: requireAuth },
    getBlockedWebsites,
  );
  app.patch<{ Params: BlockedWebsiteParams; Body: UpdateBlockedWebsiteBody }>(
    "/api/blocked-websites/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: blockedWebsiteIdParamsSchema,
        body: updateBlockedWebsiteSchema,
      },
    },
    updateBlockedWebsite,
  );
  app.delete<{ Params: BlockedWebsiteParams }>(
    "/api/blocked-websites/:id",
    { preHandler: requireAuth, schema: { params: blockedWebsiteIdParamsSchema } },
    removeBlockedWebsite,
  );
};
