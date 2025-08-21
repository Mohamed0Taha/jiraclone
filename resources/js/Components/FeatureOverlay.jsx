import React from 'react';

const FeatureOverlay = ({ feature, onUpgrade }) => {
    const getFeatureInfo = () => {
        switch (feature) {
            case 'ai_assistant':
                return {
                    title: 'AI Assistant',
                    description: 'Upgrade to interact with our intelligent project assistant',
                    icon: '🤖',
                };
            case 'automation':
                return {
                    title: 'Automations',
                    description: 'Automate your workflow with smart triggers and actions',
                    icon: '⚙️',
                };
            case 'members':
                return {
                    title: 'Team Collaboration',
                    description: 'Invite team members and collaborate on projects',
                    icon: '👥',
                };
            case 'reports':
                return {
                    title: 'Reports',
                    description: 'Generate detailed project reports and analytics',
                    icon: '📊',
                };
            default:
                return {
                    title: 'Premium Feature',
                    description: 'This feature is available on paid plans',
                    icon: '🔒',
                };
        }
    };

    const featureInfo = getFeatureInfo();

    return (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
                <div className="text-4xl mb-4">{featureInfo.icon}</div>
                <div className="text-xl mb-2 text-gray-800 flex items-center justify-center gap-2">
                    {featureInfo.title}
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <p className="text-gray-600 mb-4">{featureInfo.description}</p>
                <button
                    onClick={onUpgrade}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Upgrade Now
                </button>
            </div>
        </div>
    );
};

export default FeatureOverlay;
