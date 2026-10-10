import { z } from "zod";

/** Trims strings and turns blank ones into undefined so optional fields can be omitted from forms. */
export const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" ? (value.trim() === "" ? undefined : value.trim()) : value;

export const optionalText = (max = 255) => z.preprocess(blankToUndefined, z.string().max(max).optional());
export const optionalDate = z.preprocess(blankToUndefined, z.coerce.date().optional());
export const optionalNumber = z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional());
