import { usePage } from '@inertiajs/react';

export const useSubscription = () => {
    const { auth, userPlan } = usePage().props;
    const user = auth?.user;

    const hasActiveSubscription = () => {
        return userPlan?.has_subscription || false;
    };

    const getCurrentPlan = () => {
        return userPlan?.plan || 'free';
    };

    const isOnTrial = () => {
        if (!user) return false;
        return user.on_trial || false;
    };

    const shouldShowOverlay = (feature) => {
        return userPlan?.overlays?.[feature] || false;
    };

    const canAccessFeature = (feature) => {
        return !shouldShowOverlay(feature);
    };

    const getUsage = () => {
        return userPlan?.usage || {};
    };

    const getAiTaskLimit = () => {
        return userPlan?.usage?.limits?.ai_tasks || 0;
    };

    const getRemainingAiTasks = () => {
        const usage = getUsage();
        const limit = usage.limits?.ai_tasks || 0;
        const used = usage.ai_tasks || 0;
        return Math.max(0, limit - used);
    };

    const getSubscriptionStatus = () => {
        if (!user) return 'none';
        if (isOnTrial()) return 'trial';
        if (hasActiveSubscription()) return 'active';
        return 'none';
    };

    return {
        user,
        userPlan,
        hasActiveSubscription: hasActiveSubscription(),
        getCurrentPlan: getCurrentPlan(),
        isOnTrial: isOnTrial(),
        shouldShowOverlay,
        canAccessFeature,
        getUsage: getUsage(),
        getAiTaskLimit: getAiTaskLimit(),
        getRemainingAiTasks: getRemainingAiTasks(),
        getSubscriptionStatus: getSubscriptionStatus(),
    };
};
