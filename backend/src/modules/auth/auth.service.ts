import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { hashPassword, verifyPassword } from "../../shared/security/password.js";
import type { LoginBody, RegisterBody } from "./auth.types.js";

const publicUserSelect = {
  id: true,
  email: true,
  timezone: true,
  createdAt: true,
} as const;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const registerUser = async (input: RegisterBody) => {
  const email = normalizeEmail(input.email);

  try {
    return await prisma.user.create({
      data: {
        authProviderId: `local:${email}`,
        email,
        passwordHash: await hashPassword(input.password),
        timezone: input.timezone ?? "UTC",
      },
      select: publicUserSelect,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }

    throw error;
  }
};

export const authenticateUser = async (input: LoginBody) => {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  return {
    id: user.id,
    email: user.email,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
};
