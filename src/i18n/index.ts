import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

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
  resources: { fr: { translation: fr }, en: { translation: en } },
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
