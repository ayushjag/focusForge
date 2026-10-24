import app from "./app.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "127.0.0.1";

const startServer = async (): Promise<void> => {
  try {
    await app.listen({
      port: PORT,
      host: HOST,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();
