import React, { useState, useCallback, useEffect } from 'react';
import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import CookieConsent from '@/Components/CookieConsent';
import TailwindThemeLanguageSwitcher from '@/Components/TailwindThemeLanguageSwitcher';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function AuthenticatedLayout({ header, children }) {
    const { t } = useTranslation();
    // CACHE BUST: Admin button completely removed - build 002
    const { props } = usePage();
    const user = props?.auth?.user || {};
    const [mobileOpen, setMobileOpen] = useState(false);

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') closeMobile();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [closeMobile]);

    const initials = (user.name || user.email || 'U')
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const onDashboard = route().current('dashboard');

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <nav
                className="
          sticky top-0 z-40
          backdrop-blur-md
          bg-white/75 dark:bg-gray-800/75
          border-b border-gray-200 dark:border-gray-700
          shadow-[0_4px_16px_-6px_rgba(0,0,0,0.15)]
        "
                role="navigation"
                aria-label="Main"
            >
                <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        {/* Left section */}
                        <div className="flex items-center gap-5">
                            {/* Brand (static text now, not another dashboard link) */}
                            <div className="flex items-center gap-2">
                                <img
                                    src="/taskpilot-logo.png"
                                    alt="TaskPilot Logo"
                                    className="w-8 h-8 rounded-full shadow-sm"
                                />
                                <div
                                    className="
                      font-bold tracking-wide text-lg sm:text-xl
                      bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                      bg-clip-text text-transparent select-none
                      font-['Inter','system-ui','Segoe_UI','Roboto','Helvetica_Neue','Arial','sans-serif']
                      drop-shadow-sm
                    "
                                    aria-label="TaskPilot"
                                    style={{
                                        fontFamily:
                                            '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif',
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    TaskPilot
                                </div>
                            </div>

                            {/* Single Dashboard button */}
                            <Link
                                href={route('dashboard')}
                                className={`
                  relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                  transition
                  focus:outline-none focus-visible:ring-2 ring-offset-2 ring-indigo-500
                  ${
                      onDashboard
                          ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow hover:from-indigo-500 hover:to-fuchsia-500'
                          : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-600'
                  }
                `}
                            >
                                {onDashboard && (
                                    <span
                                        className="absolute inset-0 rounded-full bg-white/10"
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative">{t('common.dashboard')}</span>
                            </Link>
                        </div>

                        {/* Right / User (desktop) */}
                        <div className="hidden sm:flex items-center gap-4">
                            {/* Theme and Language Switcher */}
                            <TailwindThemeLanguageSwitcher />
                            
                            <div className="relative">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button
                                            type="button"
                                            className="
                        group inline-flex items-center gap-2
                        rounded-full pl-1 pr-3 py-1
                        bg-white/80 dark:bg-gray-700/80
                        border border-gray-300 dark:border-gray-600
                        hover:bg-white dark:hover:bg-gray-600
                        transition
                        focus:outline-none focus-visible:ring-2 ring-indigo-500
                      "
                                        >
                                            <span
                                                className="
                          flex h-7 w-7 items-center justify-center rounded-full
                          bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-purple-600
                          text-[11px] font-semibold tracking-wide text-white shadow
                        "
                                                aria-hidden="true"
                                            >
                                                {initials}
                                            </span>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {user.name || t('common.user')}
                                            </span>
                                            <svg
                                                className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform group-data-[open=true]:rotate-180"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content className="w-52">
                                        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                {t('common.signedInAs')}
                                            </p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                        <Dropdown.Link href={route('profile.edit')}>
                                            {t('common.profile')}
                                        </Dropdown.Link>
                                        <Dropdown.Link href={route('billing.show')}>
                                            {t('common.subscriptions')}
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('certification.index')}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                window.location.href = route('certification.index');
                                            }}
                                        >
                                            {t('common.getCertified')}
                                        </Dropdown.Link>
                                        <Dropdown.Link href={route('contact.show')}>
                                            {t('navigation.contact')}
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            {t('common.logout')}
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Mobile toggle */}
                        <div className="flex items-center sm:hidden">
                            <button
                                onClick={() => setMobileOpen((p) => !p)}
                                className="
                  inline-flex items-center justify-center rounded-md p-2
                  text-gray-600
                  hover:bg-gray-200/70
                  focus:outline-none focus-visible:ring-2 ring-indigo-500
                  transition
                "
                                aria-label="Toggle navigation menu"
                                aria-expanded={mobileOpen}
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={!mobileOpen ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={mobileOpen ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile panel */}
                <div
                    className={`
            sm:hidden overflow-hidden
            transition-[max-height,opacity] duration-300 ease
            ${mobileOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}
          `}
                >
                    <div className="px-4 pt-3 pb-6 space-y-6 bg-white/90 backdrop-blur-md border-t border-gray-200">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                Navigation
                            </p>
                            <div className="space-y-1">
                                <ResponsiveNavLink
                                    href={route('dashboard')}
                                    active={onDashboard}
                                    onClick={closeMobile}
                                >
                                    Dashboard
                                </ResponsiveNavLink>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center gap-3">
                                <span
                                    className="
                    flex h-10 w-10 items-center justify-center rounded-full
                    bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-purple-600
                    text-sm font-semibold text-white shadow
                  "
                                >
                                    {initials}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                        {user.name || 'User'}
                                    </div>
                                    <div className="text-xs font-medium text-gray-500 truncate">
                                        {user.email}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-1">
                                <ResponsiveNavLink
                                    href={route('profile.edit')}
                                    onClick={closeMobile}
                                >
                                    Profile
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('billing.show')}
                                    onClick={closeMobile}
                                >
                                    Subscriptions
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('certification.index')}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        closeMobile();
                                        window.location.href = route('certification.index');
                                    }}
                                >
                                    Get Certified
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    href={route('contact.show')}
                                    onClick={closeMobile}
                                >
                                    Contact Us
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                    onClick={closeMobile}
                                >
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main>{children}</main>

            <CookieConsent />
        </div>
    );
}
