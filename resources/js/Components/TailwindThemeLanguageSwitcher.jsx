// resources/js/Components/TailwindThemeLanguageSwitcher.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/ThemeContext';
import { languages, getCurrentLanguage, setLanguage } from '../utils/languageUtils';

export default function TailwindThemeLanguageSwitcher() {
    const { mode, toggleMode } = useThemeMode();
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);
    const [isChangingLanguage, setIsChangingLanguage] = useState(false);
    const dropdownRef = useRef(null);
    const languageDropdownRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
                setIsLanguageOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (isLanguageOpen) {
                if (event.key === 'Escape') {
                    setIsLanguageOpen(false);
                }
            }
            if (isOpen) {
                if (event.key === 'Escape') {
                    setIsOpen(false);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLanguageOpen]);

    const handleLanguageChange = async (languageCode) => {
        setIsChangingLanguage(true);
        
        const success = await setLanguage(i18n, languageCode);
        
        if (success) {
            setIsLanguageOpen(false);
            setIsOpen(false);
        } else {
            // Show error message or fallback behavior
            console.error('Failed to change language to:', languageCode);
        }
        
        setIsChangingLanguage(false);
    };

    const currentLanguage = getCurrentLanguage(i18n);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
                    inline-flex items-center justify-center
                    w-8 h-8 rounded-full
                    bg-white/80 hover:bg-white
                    border border-gray-300
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                "
                aria-label={t('common.settings')}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <div 
                    className="
                        absolute right-0 mt-2 w-64 
                        bg-white rounded-lg shadow-lg border border-gray-200
                        py-2 z-50
                        transform transition-all duration-200 ease-out origin-top-right
                    "
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* Theme Toggle */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {mode === 'light' ? (
                                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                                <span className="text-sm font-medium text-gray-700">
                                    {t('theme.toggle')}
                                </span>
                            </div>
                            <button
                                onClick={toggleMode}
                                className={`
                                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                    ${mode === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'}
                                `}
                                role="switch"
                                aria-checked={mode === 'dark'}
                                aria-label={t('theme.toggle')}
                            >
                                <span
                                    className={`
                                        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                                        transition duration-200 ease-in-out
                                        ${mode === 'dark' ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="relative" ref={languageDropdownRef}>
                        <button
                            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                            className="
                                w-full px-4 py-3 text-left 
                                hover:bg-gray-50 
                                transition-colors duration-200
                                focus:outline-none focus:bg-gray-50
                            "
                            aria-label={t('language.select')}
                            aria-expanded={isLanguageOpen}
                            aria-haspopup="menu"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">
                                        {t('language.select')}
                                    </span>
                                    <span className="text-sm">{currentLanguage.flag}</span>
                                </div>
                                <svg 
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLanguageOpen ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>

                        {isLanguageOpen && (
                            <div className="border-t border-gray-100">
                                {languages.map((language) => {
                                    const isSelected = currentLanguage.code === language.code;
                                    return (
                                        <button
                                            key={language.code}
                                            onClick={() => handleLanguageChange(language.code)}
                                            disabled={isChangingLanguage}
                                            className={`
                                                w-full px-6 py-2 text-left text-sm
                                                hover:bg-gray-50 transition-colors duration-200
                                                focus:outline-none focus:bg-gray-50
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                                            `}
                                            aria-label={`Switch to ${language.nativeName}`}
                                            role="menuitem"
                                            tabIndex={isLanguageOpen ? 0 : -1}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-base" role="img" aria-label={`${language.nativeName} flag`}>
                                                    {language.flag}
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{t(language.name)}</span>
                                                    {t(language.name) !== language.nativeName && (
                                                        <span className="text-xs opacity-75">{language.nativeName}</span>
                                                    )}
                                                </div>
                                                {isChangingLanguage && currentLanguage.code === language.code ? (
                                                    <div className="ml-auto">
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
                                                        className="w-4 h-4 ml-auto text-indigo-600" 
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
                </div>
            )}
        </div>
    );
}