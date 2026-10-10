import { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { STATUS_CODES } from "node:http";
import { ApiError } from "../common/api-error";
import { env } from "../config/env";

type HttpLikeError = Error & { status?: number; statusCode?: number; type?: string; code?: string };

const DEFAULT_CODES: Record<number, string> = {
  400: "VALIDATION_ERROR", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
  409: "CONFLICT", 429: "RATE_LIMITED", 500: "INTERNAL",
};

const fromPrisma = (error: Prisma.PrismaClientKnownRequestError): ApiError | undefined => {
  switch (error.code) {
    case "P2002": {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(", ") : typeof target === "string" ? target : "value";
      return new ApiError(409, `${fields} already exists`, [], "CONFLICT");
    }
    case "P2025":
      return new ApiError(404, "Record not found", [], "NOT_FOUND");
    case "P2003":
      return new ApiError(409, "Record is still referenced", [], "CONFLICT");
    default:
      return undefined;
  }
};

/** Maps known library errors (Prisma, body-parser, multer) to client errors; anything else stays a 500. */
const translate = (error: unknown): ApiError | undefined => {
  if (error instanceof ApiError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return fromPrisma(error);
  if (error instanceof Prisma.PrismaClientValidationError) return new ApiError(400, "Invalid request data", [], "VALIDATION_ERROR");
  if (!(error instanceof Error)) return undefined;

  const candidate = error as HttpLikeError;
  if (candidate.name === "MulterError") {
    return new ApiError(candidate.code === "LIMIT_FILE_SIZE" ? 413 : 400, candidate.message);
  }
  if (candidate.type === "entity.parse.failed") return new ApiError(400, "Malformed JSON body", [], "VALIDATION_ERROR");
  if (candidate.type === "entity.too.large") return new ApiError(413, "Request body is too large");
  const status = candidate.status ?? candidate.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) return new ApiError(status, candidate.message);
  return undefined;
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError = translate(error);
  const status = apiError?.status ?? 500;
  if (status >= 500 && env.NODE_ENV !== "test") console.error(error);
  res.status(status).json({
    timestamp: new Date().toISOString(), status,
    error: STATUS_CODES[status] ?? "Error",
    message: apiError?.message ?? "An unexpected error occurred",
    ...((apiError?.code ?? DEFAULT_CODES[status]) ? { code: apiError?.code ?? DEFAULT_CODES[status] } : {}),
    path: req.originalUrl, fieldErrors: apiError?.fieldErrors ?? [],
  });
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, "Route not found", [], "NOT_FOUND"));
};
