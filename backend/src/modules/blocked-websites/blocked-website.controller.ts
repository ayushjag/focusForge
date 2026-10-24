import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import {
  createBlockedWebsite as createBlockedWebsiteForUser,
  deleteBlockedWebsite as deleteBlockedWebsiteForUser,
  listBlockedWebsites,
  updateBlockedWebsite as updateBlockedWebsiteForUser,
} from "./blocked-website.service.js";
import type {
  BlockedWebsiteParams,
  CreateBlockedWebsiteBody,
  UpdateBlockedWebsiteBody,
} from "./blocked-website.types.js";

export const createBlockedWebsite = async (
  request: FastifyRequest<{ Body: CreateBlockedWebsiteBody }>,
  reply: FastifyReply,
) => {
  const blockedWebsite = await createBlockedWebsiteForUser(
    getRequestUserId(request),
    request.body.domain,
  );

  return reply.status(201).send({ success: true, data: blockedWebsite });
};

export const getBlockedWebsites = async (request: FastifyRequest) => {
  const blockedWebsites = await listBlockedWebsites(getRequestUserId(request));
  return { success: true, data: blockedWebsites };
};

export const updateBlockedWebsite = async (
  request: FastifyRequest<{
    Params: BlockedWebsiteParams;
    Body: UpdateBlockedWebsiteBody;
  }>,
) => {
  const blockedWebsite = await updateBlockedWebsiteForUser(
    getRequestUserId(request),
    request.params.id,
    request.body.enabled,
  );

  return { success: true, data: blockedWebsite };
};

export const removeBlockedWebsite = async (
  request: FastifyRequest<{ Params: BlockedWebsiteParams }>,
) => {
  await deleteBlockedWebsiteForUser(getRequestUserId(request), request.params.id);
  return { success: true, message: "Blocked website deleted" };
};
