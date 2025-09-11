import React from 'react';
import { useTranslation } from 'react-i18next';

const FeatureOverlay = ({ feature, onUpgrade }) => {
    const { t } = useTranslation();
    const getFeatureInfo = () => {
        switch (feature) {
            case 'ai_assistant':
                return {
                    title: t('features.aiAssistant'),
                    description: t('features.aiAssistantDesc'),
                    icon: '🤖',
                };
            case 'automation':
                return {
                    title: t('features.automation'),
                    description: t('features.automationDesc'),
                    icon: '⚙️',
                };
            case 'members':
                return {
                    title: t('features.teamCollaboration'),
                    description: t('features.teamCollaborationDesc'),
                    icon: '👥',
                };
            case 'reports':
                return {
                    title: t('features.reports'),
                    description: t('features.reportsDesc'),
                    icon: '📊',
                };
            default:
                return {
                    title: t('features.premiumFeature'),
                    description: t('features.premiumFeatureDesc'),
                    icon: '🔒',
                };
        }
    };

    const featureInfo = getFeatureInfo();

    return (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
                <div className="text-4xl mb-4">{featureInfo.icon}</div>
                <div className="text-xl mb-2 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
                    {featureInfo.title}
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{featureInfo.description}</p>
                <button
                    onClick={onUpgrade}
                    className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                    {t('common.upgradeNow')}
                </button>
            </div>
        </div>
    );
};

export default FeatureOverlay;
