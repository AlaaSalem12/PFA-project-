import i18n from '../i18n';

type DateInput = string | number | Date | null | undefined;

const EMPTY = '—';

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function locale(): string {
  return i18n.language || 'fr';
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
};

const moneyFormatter = new Intl.NumberFormat('fr-TN', {
  style: 'currency',
  currency: 'TND',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatDate(value: DateInput, fallback = EMPTY): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale(), DATE_OPTIONS).format(date) : fallback;
}

export function formatDateTime(value: DateInput, fallback = EMPTY): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale(), DATE_TIME_OPTIONS).format(date) : fallback;
}

/** Enum groups of `enums.<ENUM>.<VALUE>` in the locale files. */
const ENUM_GROUPS = [
  'UserRole',
  'MachineStatus',
  'MachineType',
  'WorkOrderType',
  'WorkOrderPriority',
  'WorkOrderStatus',
  'EmployeeStatus',
] as const;

export type EnumName = (typeof ENUM_GROUPS)[number];

/** Translated label of an enum value; falls back to "Under maintenance" style text. */
export function formatEnum(
  value: string | null | undefined,
  enumName?: EnumName,
  fallback = EMPTY,
): string {
  if (!value) return fallback;
  const groups = enumName ? [enumName] : ENUM_GROUPS;
  for (const group of groups) {
    const key = `enums.${group}.${value}`;
    if (i18n.exists(key)) return i18n.t(key);
  }
  const text = value.replaceAll('_', ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMoney(value: number | null | undefined, fallback = EMPTY): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return moneyFormatter.format(value);
}
