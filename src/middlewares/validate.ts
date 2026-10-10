import { RequestHandler } from "express";
import { z } from "zod";
import { ApiError } from "../common/api-error";

export const validate = (schemas: {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}): RequestHandler => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      Object.defineProperty(req, "query", { value: schemas.query.parse(req.query), writable: true });
    }
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ApiError(400, "Validation failed", error.issues.map((issue) => ({
        field: issue.path.join("."), message: issue.message,
      }))));
      return;
    }
    next(error);
  }
};
