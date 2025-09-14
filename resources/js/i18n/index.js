// resources/js/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import deTranslations from './locales/de.json';
import fiTranslations from './locales/fi.json';
import svTranslations from './locales/sv.json';
import nlTranslations from './locales/nl.json';
import frTranslations from './locales/fr.json';

const resources = {
    en: { translation: enTranslations },
    es: { translation: esTranslations },
    de: { translation: deTranslations },
    fi: { translation: fiTranslations },
    sv: { translation: svTranslations },
    nl: { translation: nlTranslations },
    fr: { translation: frTranslations },
};

// List of supported languages for validation
export const supportedLanguages = ['en', 'es', 'de', 'fi', 'sv', 'nl', 'fr'];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        
        // Enhanced language detection order
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage'],
            lookupLocalStorage: 'jiraclone-language',
            lookupFromPathIndex: 0,
            lookupFromSubdomainIndex: 0,
            excludeCacheFor: ['cimode'], // cimode is for testing
            checkWhitelist: true,
        },

        // Add whitelist to ensure only supported languages are used
        supportedLngs: supportedLanguages,
        nonExplicitSupportedLngs: true,

        interpolation: {
            escapeValue: false, // React already does escaping
        },

        react: {
            useSuspense: false,
        },

        // Load missing keys to fallback language
        saveMissing: false,
        
        // Return keys if translation is missing in debug mode
        returnNull: false,
        returnEmptyString: false,
    });

export default i18n;