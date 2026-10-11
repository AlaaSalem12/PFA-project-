const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

/** "il y a 3 heures" style date, localised with the given language. */
export function formatRelative(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const match = UNITS.find(({ seconds }) => Math.abs(diffSeconds) >= seconds);
  if (!match) return formatter.format(0, 'minute');
  return formatter.format(Math.round(diffSeconds / match.seconds), match.unit);
}
