import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const getBlockedWebsiteOrThrow = async (userId: string, blockedWebsiteId: string) => {
  const blockedWebsite = await prisma.blockedWebsite.findFirst({
    where: { id: blockedWebsiteId, userId },
  });

  if (!blockedWebsite) {
    throw new AppError("Blocked website not found", 404, "BLOCKED_WEBSITE_NOT_FOUND");
  }

  return blockedWebsite;
};

const isValidDomain = (hostname: string): boolean => {
  if (!hostname.includes(".") || hostname.length > 253 || isIP(hostname) !== 0) {
    return false;
  }

  return hostname.split(".").every(
    (label) =>
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
};

export const normalizeDomain = (input: string): string => {
  const value = input.trim().toLowerCase();

  if (!value) {
    throw new AppError("domain cannot be empty", 400, "INVALID_DOMAIN");
  }

  let url: URL;

  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new AppError("Enter a valid website domain or URL", 400, "INVALID_DOMAIN");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new AppError("Enter a valid website domain or URL", 400, "INVALID_DOMAIN");
  }

  const hostname = url.hostname.replace(/^www\./, "").replace(/\.$/, "");

  if (!isValidDomain(hostname)) {
    throw new AppError("Enter a valid public domain", 400, "INVALID_DOMAIN");
  }

  return hostname;
};

export const createBlockedWebsite = async (userId: string, domainInput: string) => {
  const domain = normalizeDomain(domainInput);

  try {
    return await prisma.blockedWebsite.create({
      data: { userId, domain },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "This domain is already in your blocked website list",
        409,
        "DOMAIN_ALREADY_BLOCKED",
      );
    }

    throw error;
  }
};

export const listBlockedWebsites = async (userId: string) =>
  prisma.blockedWebsite.findMany({
    where: { userId },
    orderBy: [{ enabled: "desc" }, { domain: "asc" }],
  });

export const updateBlockedWebsite = async (
  userId: string,
  blockedWebsiteId: string,
  enabled: boolean,
) => {
  const blockedWebsite = await getBlockedWebsiteOrThrow(userId, blockedWebsiteId);

  return prisma.blockedWebsite.update({
    where: { id: blockedWebsite.id },
    data: { enabled },
  });
};

export const deleteBlockedWebsite = async (userId: string, blockedWebsiteId: string) => {
  const blockedWebsite = await getBlockedWebsiteOrThrow(userId, blockedWebsiteId);
  await prisma.blockedWebsite.delete({ where: { id: blockedWebsite.id } });
};
