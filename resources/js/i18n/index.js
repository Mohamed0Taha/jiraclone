// resources/js/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import deTranslations from './locales/de.json';
import fiTranslations from './locales/fi.json';
import seTranslations from './locales/se.json';
import nlTranslations from './locales/nl.json';
import frTranslations from './locales/fr.json';

const resources = {
    en: { translation: enTranslations },
    es: { translation: esTranslations },
    de: { translation: deTranslations },
    fi: { translation: fiTranslations },
    se: { translation: seTranslations },
    nl: { translation: nlTranslations },
    fr: { translation: frTranslations },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'jiraclone-language',
        },

        interpolation: {
            escapeValue: false, // React already does escaping
        },

        react: {
            useSuspense: false,
        },
    });

export default i18n;