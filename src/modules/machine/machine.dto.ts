/** Prisma Decimals serialize as strings; the API contract exposes them as JSON numbers. */
const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

type WithDecimals = { hourlyCost?: unknown; operatingHours?: unknown };

export const toMachineDto = <T extends WithDecimals>(machine: T) => ({
  ...machine,
  hourlyCost: num(machine.hourlyCost),
  operatingHours: num(machine.operatingHours) ?? 0,
});

export const toMachineDtos = <T extends WithDecimals>(machines: T[]) => machines.map(toMachineDto);
