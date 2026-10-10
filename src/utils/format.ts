type DateInput = string | number | Date | null | undefined;

const EMPTY = '—';

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const moneyFormatter = new Intl.NumberFormat('fr-TN', {
  style: 'currency',
  currency: 'TND',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatDate(value: DateInput, fallback = EMPTY): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatDateTime(value: DateInput, fallback = EMPTY): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

/** "UNDER_MAINTENANCE" → "Under maintenance" */
export function formatEnum(value: string | null | undefined, fallback = EMPTY): string {
  if (!value) return fallback;
  const text = value.replaceAll('_', ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMoney(value: number | null | undefined, fallback = EMPTY): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return moneyFormatter.format(value);
}
