import i18n from '../../i18n';

export function greeting(name?: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return i18n.t(`dashboard.greeting.${part}`, {
    name: name?.split(' ')[0] || i18n.t('dashboard.greeting.fallbackName'),
  });
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
