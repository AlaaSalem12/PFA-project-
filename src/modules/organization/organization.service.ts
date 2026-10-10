import { prisma } from "../../config/prisma";
import { ApiError } from "../../common/api-error";

export type CatalogKind = "department" | "position";
export type CatalogInput = { name: string; description?: string };

type CatalogRow = { id: number; name: string; description: string | null; _count: { employees: number } };

// Departments and positions are structurally identical, so one service handles both.
type CatalogDelegate = {
  findMany(args: object): Promise<CatalogRow[]>;
  findUnique(args: object): Promise<CatalogRow | null>;
  create(args: object): Promise<CatalogRow>;
  update(args: object): Promise<CatalogRow>;
  delete(args: object): Promise<unknown>;
};

const countActiveEmployees = { _count: { select: { employees: { where: { deletedAt: null } } } } };

const toDto = (row: CatalogRow) => ({
  id: row.id, name: row.name, description: row.description, employeeCount: row._count.employees,
});

export class CatalogService {
  constructor(private readonly kind: CatalogKind) {}

  private get model(): CatalogDelegate {
    return (this.kind === "department" ? prisma.department : prisma.position) as unknown as CatalogDelegate;
  }

  private get label(): string {
    return this.kind === "department" ? "Department" : "Position";
  }

  async list() {
    return (await this.model.findMany({ orderBy: { name: "asc" }, include: countActiveEmployees })).map(toDto);
  }

  async create(input: CatalogInput, actor: string) {
    return toDto(await this.model.create({ data: { ...input, createdBy: actor }, include: countActiveEmployees }));
  }

  async update(id: number, input: CatalogInput) {
    // Missing id -> Prisma P2025 -> 404; duplicate name -> P2002 -> 409 (see error handler).
    return toDto(await this.model.update({ where: { id }, data: input, include: countActiveEmployees }));
  }

  async remove(id: number) {
    const row = await this.model.findUnique({ where: { id }, include: countActiveEmployees });
    if (!row) throw new ApiError(404, `${this.label} not found`, [], "NOT_FOUND");
    if (row._count.employees > 0) {
      throw new ApiError(409, `${this.label} still has ${row._count.employees} employee(s)`, [], "CONFLICT");
    }
    await this.model.delete({ where: { id } });
  }
}
