import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from '../locales/ja.json';
import en from '../locales/en.json';

function resolveInitialLang(): 'ja' | 'en' {
  try {
    const raw = localStorage.getItem('snipdock');
    if (raw) {
      const lang = JSON.parse(raw)?.settings?.language;
      if (lang === 'ja' || lang === 'en') return lang;
    }
  } catch { /* ignore */ }
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
  },
  lng: resolveInitialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
