import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { useTranslation } from 'react-i18next';

export default function PublicSimulator({ title, description }) {
    const { t } = useTranslation();
    const [isStarting, setIsStarting] = useState(false);

    const startSimulation = () => {
        setIsStarting(true);

        router.post(
            '/practice/start',
            {},
            {
                onSuccess: () => {
                    // Router will automatically handle the redirect
                    setIsStarting(false);
                },
                onError: (errors) => {
                    setIsStarting(false);
                    alert(t('simulator.startFailed'));
                },
                onFinish: () => {
                    setIsStarting(false);
                },
            }
        );
    };

    return (
        <PublicLayout>
            <Head title={title} />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
                <div className="container mx-auto px-4 py-16">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-full mb-6">
                            <svg
                                className="w-10 h-10"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">
                            {t('simulator.title')}
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            {description}
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                {t('simulator.features.analytics.title')}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {t('simulator.features.analytics.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                {t('simulator.features.instantFeedback.title')}
                            </h3>
                            <p className="text-gray-600">
                                {t('simulator.features.instantFeedback.description')}
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                {t('simulator.features.noRegistration.title')}
                            </h3>
                            <p className="text-gray-600">
                                {t('simulator.features.noRegistration.description')}
                            </p>
                        </div>
                    </div>

                    {/* What You'll Experience */}
                    <div className="bg-white rounded-2xl p-8 mb-16 shadow-lg border border-gray-100">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                            {t('simulator.whatYouExperience')}
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.navigateScenarios')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.criticalDecisions')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.handleConflicts')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.manageBudgets')}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <ul className="space-y-4">
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.adaptRequirements')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.applyMethodologies')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.learnConsequences')}
                                        </span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                        <span className="text-gray-700">
                                            {t('simulator.experience.buildConfidence')}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="text-center">
                        <button
                            onClick={startSimulation}
                            disabled={isStarting}
                            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-lg rounded-xl transition duration-200 shadow-lg hover:shadow-xl"
                        >
                            {isStarting ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    {t('simulator.button.generating')}
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {t('simulator.button.start')}
                                </>
                            )}
                        </button>

                        <p className="text-gray-500 mt-4 text-sm">
                            {t('simulator.subtitle')}
                        </p>

                        <div className="mt-8 text-center">
                            <p className="text-gray-600 mb-2">{t('simulator.cta.certification')}</p>
                            <Link
                                href="/login"
                                className="text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                                {t('simulator.cta.createAccount')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
