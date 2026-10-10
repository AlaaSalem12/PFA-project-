import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().regex(/^[A-Za-z]+,(asc|desc)$/).default("id,desc"),
  search: z.string().trim().optional(),
});

export const pageResponse = <T>(content: T[], totalElements: number, page: number, size: number) => ({
  content, totalElements, totalPages: Math.ceil(totalElements / size), number: page, size,
});
