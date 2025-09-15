// resources/js/utils/languageUtils.js
import { supportedLanguages } from '../i18n/index.js';

export const languages = [
    { code: 'en', name: 'language.english', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es', name: 'language.spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'de', name: 'language.german', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'fi', name: 'language.finnish', flag: '🇫🇮', nativeName: 'Suomi' },
    { code: 'sv', name: 'language.swedish', flag: '🇸🇪', nativeName: 'Svenska' },
    { code: 'nl', name: 'language.dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
    { code: 'fr', name: 'language.french', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'pt', name: 'language.portuguese', flag: '🇵🇹', nativeName: 'Português' },
    { code: 'it', name: 'language.italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { code: 'hu', name: 'language.hungarian', flag: '🇭🇺', nativeName: 'Magyar' },
    { code: 'ro', name: 'language.romanian', flag: '🇷🇴', nativeName: 'Română' },
    { code: 'pl', name: 'language.polish', flag: '🇵🇱', nativeName: 'Polski' },
    { code: 'ru', name: 'language.russian', flag: '🇷🇺', nativeName: 'Русский' },
    { code: 'da', name: 'language.danish', flag: '🇩🇰', nativeName: 'Dansk' },
    { code: 'no', name: 'language.norwegian', flag: '🇳🇴', nativeName: 'Norsk' },
    { code: 'et', name: 'language.estonian', flag: '🇪🇪', nativeName: 'Eesti' },
    { code: 'lv', name: 'language.latvian', flag: '🇱🇻', nativeName: 'Latviešu' },
];

/**
 * Check if a language code is supported
 * @param {string} languageCode - The language code to check
 * @returns {boolean} - Whether the language is supported
 */
export const isLanguageSupported = (languageCode) => {
    return supportedLanguages.includes(languageCode);
};

/**
 * Get language object by code
 * @param {string} languageCode - The language code
 * @returns {object|null} - The language object or null if not found
 */
export const getLanguageByCode = (languageCode) => {
    return languages.find(lang => lang.code === languageCode) || null;
};

/**
 * Get the default language
 * @returns {object} - The default language object (English)
 */
export const getDefaultLanguage = () => {
    return languages.find(lang => lang.code === 'en') || languages[0];
};

/**
 * Validate and normalize language code
 * @param {string} languageCode - The language code to validate
 * @returns {string} - A valid language code
 */
export const normalizeLanguageCode = (languageCode) => {
    if (!languageCode) return 'en';
    
    // Handle language codes with region (e.g., 'en-US' -> 'en')
    const normalizedCode = languageCode.split('-')[0].toLowerCase();
    
    return isLanguageSupported(normalizedCode) ? normalizedCode : 'en';
};

/**
 * Get current language from i18next instance with fallback
 * @param {object} i18n - The i18next instance
 * @returns {object} - The current language object
 */
export const getCurrentLanguage = (i18n) => {
    const currentLang = i18n.language || i18n.languages?.[0] || 'en';
    const normalizedLang = normalizeLanguageCode(currentLang);
    const languageObj = getLanguageByCode(normalizedLang) || getDefaultLanguage();
    
    // Ensure we only return the clean language object without any codes
    return {
        code: languageObj.code,
        name: languageObj.name,
        flag: languageObj.flag,
        nativeName: languageObj.nativeName
    };
};

/**
 * Set language with error handling and persistence
 * @param {object} i18n - The i18next instance
 * @param {string} languageCode - The language code to set
 * @returns {Promise<boolean>} - Whether the language change was successful
 */
export const setLanguage = async (i18n, languageCode) => {
    try {
        const normalizedCode = normalizeLanguageCode(languageCode);
        
        if (!isLanguageSupported(normalizedCode)) {
            console.warn(`Language ${languageCode} is not supported. Falling back to English.`);
            return false;
        }

        await i18n.changeLanguage(normalizedCode);
        localStorage.setItem('jiraclone-language', normalizedCode);
        
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: normalizedCode } 
        }));
        
        return true;
    } catch (error) {
        console.error('Failed to change language:', error);
        return false;
    }
};
