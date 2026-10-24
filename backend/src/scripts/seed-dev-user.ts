import prisma from "../lib/prisma.js";

const developmentUser = {
  id: "dev-user-focusforge",
  authProviderId: "local-dev-focusforge",
  email: "demo@focusforge.local",
  timezone: "Asia/Kolkata",
};

const seed = async (): Promise<void> => {
  await prisma.user.upsert({
    where: { id: developmentUser.id },
    update: developmentUser,
    create: developmentUser,
  });

  console.log(`Development user ready: ${developmentUser.id}`);
  await prisma.$disconnect();
};

seed().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
