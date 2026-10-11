import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

type Messages = { [key: string]: string | Messages };

// Extra per-area files (`locales/<area>.fr.json`, `locales/<area>.en.json`) are merged into the base files.
const areaFiles = import.meta.glob<Messages>('./locales/*.*.json', { eager: true, import: 'default' });

function merge(target: Messages, source: Messages): Messages {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    target[key] =
      typeof value === 'object' && typeof current === 'object' ? merge({ ...current }, value) : value;
  }
  return target;
}

function buildMessages(language: 'fr' | 'en', base: Messages): Messages {
  const result = merge({}, base);
  for (const [path, messages] of Object.entries(areaFiles)) {
    if (path.endsWith(`.${language}.json`)) merge(result, messages);
  }
  return result;
}

export const LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'metalworks-lang';

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'fr' ? stored : 'fr';
  } catch {
    return 'fr';
  }
}

void i18n.use(initReactI18next).init({
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  resources: {
    fr: { translation: buildMessages('fr', fr) },
    en: { translation: buildMessages('en', en) },
  },
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* storage unavailable: the choice just won't persist */
  }
});
document.documentElement.lang = i18n.language;

export default i18n;
