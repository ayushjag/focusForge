import type { FastifyInstance } from "fastify";
import { AppError } from "./app-error.js";

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error, _request, reply) => {
    const isValidationError =
      typeof error === "object" &&
      error !== null &&
      "validation" in error &&
      Array.isArray(error.validation);

    if (isValidationError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request data is invalid",
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    const requestErrorStatusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;

    if (
      requestErrorStatusCode !== undefined &&
      requestErrorStatusCode >= 400 &&
      requestErrorStatusCode < 500
    ) {
      return reply.status(requestErrorStatusCode).send({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Request data is invalid",
        },
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
  });
};
