import { SessionStatus } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { expireElapsedSession } from "../sessions/session.service.js";

export const getBlockingState = async (userId: string) => {
  await expireElapsedSession(userId);
  const [activeSession, blockedWebsites] = await prisma.$transaction([
    prisma.focusSession.findFirst({
      where: { userId, status: SessionStatus.ACTIVE },
      select: {
        id: true,
        taskId: true,
        actualStart: true,
        plannedEnd: true,
        plannedDurationMinutes: true,
      },
    }),
    prisma.blockedWebsite.findMany({
      where: { userId, enabled: true },
      select: { domain: true },
      orderBy: { domain: "asc" },
    }),
  ]);

  return {
    serverTime: new Date(),
    isFocusSessionActive: activeSession !== null,
    activeSession,
    blockedDomains: activeSession
      ? blockedWebsites.map((website) => website.domain)
      : [],
  };
};
