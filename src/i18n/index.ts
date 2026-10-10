import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'en',
  resources: {
    fr: { translation: { dashboard: 'Vue d’ensemble', users: 'Utilisateurs & rôles', profile: 'Mon profil', login: 'Connexion' } },
    en: { translation: { dashboard: 'Dashboard', users: 'Users & roles', profile: 'My profile', login: 'Sign in' } },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
