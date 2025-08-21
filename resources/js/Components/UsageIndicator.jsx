import React from 'react';

const UsageIndicator = ({ usage, feature, className = '' }) => {
    if (!usage || usage.limit === 0) return null;

    const percentage = (usage.used / usage.limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = usage.remaining === 0;

    const getFeatureName = () => {
        switch (feature) {
            case 'ai_tasks':
                return 'AI Tasks';
            case 'ai_chat':
                return 'AI Chat';
            case 'reports':
                return 'Reports';
            case 'automation':
                return 'Automations';
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
        <div className={`bg-gray-50 rounded-md p-3 ${className}`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">{getFeatureName()}</span>
                <span className={`text-sm ${isAtLimit ? 'text-red-600' : 'text-gray-600'}`}>
                    {usage.used} / {usage.limit}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            {usage.remaining > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                    {usage.remaining} remaining this month
                </div>
            )}
            {isAtLimit && (
                <div className="mt-1 text-xs text-red-600 font-medium">
                    Limit reached - Upgrade for more access
                </div>
            )}
        </div>
    );
};

export default UsageIndicator;
