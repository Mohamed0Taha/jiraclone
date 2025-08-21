// Lightweight form validation utilities
// resources/js/Pages/Projects/CreateFormValidation.js

export const KEY_REGEX = /^[A-Z0-9]+$/;
export const NAME_MIN = 3;
export const NAME_MAX = 80;
export const DESC_MAX = 4000;

// Basic validators
export const validators = {
    name: (v) => {
        if (!v?.trim()) return 'Project name is required.';
        if (v.trim().length < NAME_MIN) return `At least ${NAME_MIN} characters.`;
        if (v.length > NAME_MAX) return `Maximum ${NAME_MAX} characters.`;
        return '';
    },
    key: (v) => {
        if (!v?.trim()) return 'Key is required.';
        if (!KEY_REGEX.test(v)) return 'Uppercase letters & digits only.';
        if (v.length > 12) return 'Max 12 characters.';
        return '';
    },
    description: (v) => {
        if ((v || '').length > DESC_MAX) return `Maximum ${DESC_MAX} characters.`;
        return '';
    },
    start_end: (start, end) => {
        if (start && end && new Date(end) < new Date(start)) {
            return 'End date must be after or equal to start date.';
        }
        return '';
    },
};

// Per-step validation logic
export const validateStep = (idx, data, setLocalErrors) => {
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
