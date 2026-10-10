import { Role } from "@prisma/client";
import { z } from "zod";

/** Single source of truth for role validation; derived from the Prisma enum so it can never drift. */
export const roleSchema = z.enum(Role);
