import {
  checkDatabaseConnection,
  getCoreSchemaStatus,
} from "./database.service.js";

export const getDatabaseHealth = async () => {
  await checkDatabaseConnection();

  return {
    success: true,
    message: "Database connection is healthy",
  };
};

export const getDatabaseSchemaHealth = async () => {
  const { modelsReady, tables } = await getCoreSchemaStatus();

  return {
    success: modelsReady,
    data: tables,
  };
};
