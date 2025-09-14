// resources/js/Components/LanguageDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages, getCurrentLanguage, setLanguage } from '../utils/languageUtils';

export default function LanguageDropdown() {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isChangingLanguage, setIsChangingLanguage] = useState(false);
    const dropdownRef = useRef(null);

    // Get current language with fallback to prevent crashes
    let currentLanguage;
    try {
        // Ensure i18n is loaded before trying to get current language
        if (!i18n || !i18n.language) {
            currentLanguage = { code: 'en', name: 'language.english', flag: '🇺🇸', nativeName: 'English' };
        } else {
            currentLanguage = getCurrentLanguage(i18n);
        }
    } catch (error) {
        console.error('Error getting current language:', error);
        // Fallback to English if there's an error
        currentLanguage = { code: 'en', name: 'language.english', flag: '🇺🇸', nativeName: 'English' };
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (isOpen && event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleLanguageChange = async (languageCode) => {
        if (languageCode === currentLanguage.code || isChangingLanguage || !i18n) return;

        setIsChangingLanguage(true);
        try {
            const success = await setLanguage(i18n, languageCode);
            if (!success) {
                console.error('Failed to change language');
            }
        } catch (error) {
            console.error('Failed to change language:', error);
        } finally {
            setIsChangingLanguage(false);
            setIsOpen(false);
        }
    };

    // Don't render if i18n is not ready
    if (!i18n) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
                    inline-flex items-center gap-2
                    rounded-full pl-3 pr-2 py-1.5
                    bg-white/80 dark:bg-gray-700/80
                    border border-gray-300 dark:border-gray-600
                    hover:bg-white dark:hover:bg-gray-600
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 ring-indigo-500
                    text-sm font-medium text-gray-700 dark:text-gray-300
                    shadow-sm min-w-[100px]
                "
                aria-label={`Current language: ${currentLanguage.nativeName}`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span className="hidden sm:inline truncate">
                    {currentLanguage.nativeName}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="
                        absolute right-0 mt-2 w-56
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        rounded-lg shadow-lg
                        py-1 z-50
                        transform transition-all duration-200 ease-out origin-top-right
                        max-h-80 overflow-y-auto
                    "
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t('language.select')}
                        </p>
                    </div>

                    {languages.map((language) => {
                        const isSelected = currentLanguage.code === language.code;
                        return (
                            <button
                                key={language.code}
                                onClick={() => handleLanguageChange(language.code)}
                                disabled={isChangingLanguage}
                                className={`
                                    w-full px-4 py-2 text-left text-sm
                                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200
                                    focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}
                                `}
                                aria-label={`Switch to ${language.nativeName}`}
                                role="menuitem"
                                tabIndex={isOpen ? 0 : -1}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-medium truncate">{t(language.name)}</span>
                                        {t(language.name) !== language.nativeName && (
                                            <span className="text-xs opacity-75 truncate">{language.nativeName}</span>
                                        )}
                                    </div>
                                    {isChangingLanguage && currentLanguage.code === language.code ? (
                                        <div className="flex-shrink-0">
                                            <svg
                                                className="w-4 h-4 animate-spin text-indigo-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    ) : isSelected ? (
                                        <svg
                                            className="w-4 h-4 flex-shrink-0 text-indigo-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                            aria-hidden="true"
                                        >
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : null}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}