import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestUserId } from "../../shared/http/request-user.js";
import {
  authenticateUser,
  getCurrentUser,
  registerUser,
} from "./auth.service.js";
import type { LoginBody, RegisterBody } from "./auth.types.js";

const createAuthResponse = (request: FastifyRequest, user: { id: string; email: string }) => ({
  success: true,
  data: {
    user,
    accessToken: request.server.jwt.sign({ id: user.id, email: user.email }),
  },
});

export const register = async (
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) => {
  const user = await registerUser(request.body);

  return reply.status(201).send(createAuthResponse(request, user));
};

export const login = async (request: FastifyRequest<{ Body: LoginBody }>) => {
  const user = await authenticateUser(request.body);

  return createAuthResponse(request, user);
};

export const getMe = async (request: FastifyRequest) => {
  const user = await getCurrentUser(getRequestUserId(request));

  return { success: true, data: user };
};
