// resources/js/Components/LanguageDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages, getCurrentLanguage, setLanguage } from '../utils/languageUtils';
import { useTheme } from '@mui/material/styles';

export default function LanguageDropdown() {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isChangingLanguage, setIsChangingLanguage] = useState(false);
    const dropdownRef = useRef(null);
    const theme = useTheme();
    const [hovered, setHovered] = useState(false);

    const primaryMain = theme?.palette?.primary?.main ?? '#1976d2';
    const primaryDark = theme?.palette?.primary?.dark ?? '#115293';
    const isDark = theme?.palette?.mode === 'dark';
    const darkAccentBorder = '#60a5fa';
    const accentColor = hovered
        ? (isDark ? darkAccentBorder : primaryDark)
        : (isDark ? darkAccentBorder : primaryMain);
    const chipBackground = isDark
        ? theme?.palette?.background?.paper ?? 'rgba(30,41,59,0.9)'
        : 'rgba(255,255,255,0.85)';

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

    const menuClassName = 'language-dropdown-menu';
    useEffect(() => {
        const styleId = 'language-dropdown-scrollbar-css';
        let styleEl = document.getElementById(styleId);
        const track = isDark ? 'rgba(15,23,42,0.72)' : '#f3f4f6';
        const thumb = isDark ? 'rgba(226,232,240,0.45)' : '#9ca3af';
        const thumbHover = isDark ? 'rgba(226,232,240,0.65)' : '#6b7280';

        const css = `
            .${menuClassName} {
                scrollbar-width: thin;
                scrollbar-color: ${thumb} ${track};
            }
            .${menuClassName}::-webkit-scrollbar {
                width: 8px;
            }
            .${menuClassName}::-webkit-scrollbar-track {
                background: ${track};
                border-radius: 8px;
            }
            .${menuClassName}::-webkit-scrollbar-thumb {
                background-color: ${thumb};
                border-radius: 8px;
                border: 1px solid ${track};
            }
            .${menuClassName}::-webkit-scrollbar-thumb:hover {
                background-color: ${thumbHover};
            }
        `;

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = css;
    }, [isDark, menuClassName]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className="
                    inline-flex items-center gap-2
                    rounded-full pl-3 pr-2 py-1.5
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 ring-indigo-500
                    text-sm font-medium
                    shadow-sm min-w-[100px]
                "
                style={{
                    border: `1px solid ${accentColor}`,
                    color: accentColor,
                    backgroundColor: chipBackground,
                    backdropFilter: 'blur(6px)',
                }}
                aria-label={`Current language: ${currentLanguage.nativeName}`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span className="hidden sm:inline truncate">
                    {currentLanguage.nativeName}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: accentColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className={`
                        ${menuClassName}
                        absolute right-0 mt-2 w-56
                        border rounded-lg shadow-lg
                        py-1 z-50
                        transform transition-all duration-200 ease-out origin-top-right
                        max-h-80 overflow-y-auto
                    `}
                    style={{
                        backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : '#ffffff',
                        borderColor: isDark ? 'rgba(148,163,184,0.24)' : '#e5e7eb',
                        backdropFilter: 'blur(8px)',
                        color: isDark ? 'rgba(241,245,249,0.92)' : '#1f2937',
                    }}
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div
                        className="px-3 py-2 border-b"
                        style={{
                            borderColor: isDark ? 'rgba(148,163,184,0.22)' : '#f3f4f6',
                        }}
                    >
                        <p
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{
                                color: isDark ? 'rgba(226,232,240,0.7)' : '#6b7280',
                            }}
                        >
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
                                className="
                                    w-full px-4 py-2 text-left text-sm
                                    transition-colors duration-200 rounded-none
                                    focus:outline-none
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                                style={{
                                    backgroundColor: isSelected
                                        ? isDark
                                            ? 'rgba(99,102,241,0.16)'
                                            : 'rgba(99,102,241,0.1)'
                                        : 'transparent',
                                    color: isSelected
                                        ? (isDark ? darkAccentBorder : '#4338ca')
                                        : (isDark ? 'rgba(226,232,240,0.92)' : '#374151'),
                                    border: isSelected
                                        ? `1px solid ${isDark ? darkAccentBorder : '#4338ca'}`
                                        : '1px solid transparent',
                                    borderRadius: 8,
                                    boxSizing: 'border-box',
                                }}
                                aria-label={`Switch to ${language.nativeName}`}
                                role="menuitem"
                                tabIndex={isOpen ? 0 : -1}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="font-medium truncate">
                                            {t(language.name)}
                                        </span>
                                        {t(language.name) !== language.nativeName && (
                                            <span
                                                className="text-xs truncate"
                                                style={{ opacity: isDark ? 0.75 : 0.6, color: isDark ? 'rgba(226,232,240,0.75)' : undefined }}
                                            >
                                                {language.nativeName}
                                            </span>
                                        )}
                                    </div>
                                    {isChangingLanguage && currentLanguage.code === language.code ? (
                                        <div className="flex-shrink-0">
                                            <svg
                                                className="w-4 h-4 animate-spin"
                                                style={{ color: isDark ? 'rgba(196,203,255,0.9)' : '#6366f1' }}
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
                                            className="w-4 h-4 flex-shrink-0"
                                            style={{ color: isDark ? 'rgba(196,203,255,0.9)' : '#6366f1' }}
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
