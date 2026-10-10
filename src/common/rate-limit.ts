import { RequestHandler } from "express";
import { ApiError } from "./api-error";

/** express-rate-limit `handler`: forwards to the central error handler (Retry-After comes from standardHeaders). */
export const rateLimitHandler: RequestHandler = (_req, _res, next) => {
  next(new ApiError(429, "Too many requests, please try again later", [], "RATE_LIMITED"));
};
