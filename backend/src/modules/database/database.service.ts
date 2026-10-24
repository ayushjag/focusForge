import prisma from "../../lib/prisma.js";

type CoreSchemaTables = {
  userTable: boolean;
  taskTable: boolean;
  focusSessionTable: boolean;
};

export const checkDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`;
};

export const getCoreSchemaStatus = async (): Promise<{
  modelsReady: boolean;
  tables: CoreSchemaTables;
}> => {
  const [tables] = await prisma.$queryRaw<CoreSchemaTables[]>`
    SELECT
      to_regclass('public."User"') IS NOT NULL AS "userTable",
      to_regclass('public."Task"') IS NOT NULL AS "taskTable",
      to_regclass('public."FocusSession"') IS NOT NULL AS "focusSessionTable"
  `;

  if (!tables) {
    throw new Error("Could not read the core database schema status");
  }

  return {
    modelsReady:
      tables.userTable && tables.taskTable && tables.focusSessionTable,
    tables,
  };
};
