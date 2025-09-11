import React from 'react';
import { useTranslation } from 'react-i18next';

const UsageIndicator = ({ usage, feature, className = '' }) => {
    const { t } = useTranslation();
    if (!usage || usage.limit === 0) return null;

    const percentage = (usage.used / usage.limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = usage.remaining === 0;

    const getFeatureName = () => {
        switch (feature) {
            case 'ai_tasks':
                return t('features.aiTasks');
            case 'ai_chat':
                return t('features.aiChat');
            case 'reports':
                return t('features.reports');
            case 'automation':
                return t('features.automation');
            default:
                return feature;
        }
    };

    const getProgressColor = () => {
        if (isAtLimit) return 'bg-red-500';
        if (isNearLimit) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className={`bg-gray-50 dark:bg-gray-800 rounded-md p-3 ${className}`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getFeatureName()}</span>
                <span className={`text-sm ${isAtLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {usage.used} / {usage.limit}
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            {usage.remaining > 0 && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('usage.remainingThisMonth', { count: usage.remaining })}
                </div>
            )}
            {isAtLimit && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                    {t('usage.limitReached')}
                </div>
            )}
        </div>
    );
};

export default UsageIndicator;
