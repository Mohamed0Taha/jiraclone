// Lightweight form validation utilities
// resources/js/Pages/Projects/CreateFormValidation.js

export const KEY_REGEX = /^[A-Z0-9]+$/;
export const NAME_MIN = 3;
export const NAME_MAX = 80;
export const DESC_MAX = 4000;

// Basic validators that accept a translation function
export const createValidators = (t) => ({
    name: (v) => {
        if (!v?.trim()) return t('projects.validation.nameRequired');
        if (v.trim().length < NAME_MIN) return t('projects.validation.nameMinLength', { min: NAME_MIN });
        if (v.length > NAME_MAX) return t('projects.validation.nameMaxLength', { max: NAME_MAX });
        return '';
    },
    key: (v) => {
        if (!v?.trim()) return t('projects.validation.keyRequired');
        if (!KEY_REGEX.test(v)) return t('projects.validation.keyFormat');
        if (v.length > 12) return t('projects.validation.keyMaxLength');
        return '';
    },
    description: (v) => {
        if ((v || '').length > DESC_MAX) return t('projects.validation.descriptionMaxLength', { max: DESC_MAX });
        return '';
    },
    start_end: (start, end) => {
        if (start && end && new Date(end) < new Date(start)) {
            return t('projects.validation.endDateAfterStart');
        }
        return '';
    },
});

// Per-step validation logic
export const validateStep = (idx, data, setLocalErrors, t) => {
    const validators = createValidators(t);
    const err = {};

    if (idx === 0) {
        const e1 = validators.name(data.name);
        if (e1) err.name = e1;
        const e2 = validators.key(data.key);
        if (e2) err.key = e2;
        const e3 = validators.description(data.description);
        if (e3) err.description = e3;
    }

    if (idx === 1) {
        const e4 = validators.start_end(data.start_date, data.end_date);
        if (e4) err.end_date = e4;
    }

    // Step 2 (objectives) has no hard validation requirements

    setLocalErrors(err);
    return Object.keys(err).length === 0;
};

// Auto-generate key from name
export const generateKeyFromName = (name) => {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map((w) => w[0] || '')
        .join('')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
};
