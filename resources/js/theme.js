// resources/js/theme.js - Optimized for performance
import { createTheme } from '@mui/material/styles';

// Pre-define common values to reduce recalculation
const commonColors = {
    primary: '#6366F1',
    secondary: '#22D3EE',
    success: '#34D399',
    warning: '#F59E0B',
    error: '#F87171',
    info: '#60A5FA',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    background: '#FAFBFC',
    paper: '#FFFFFF',
};

const commonShadows = {
    1: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    4: '0 4px 14px 0 rgba(99, 102, 241, 0.25)',
    6: '0 6px 20px 0 rgba(99, 102, 241, 0.35)',
    8: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: commonColors.primary, contrastText: '#ffffff' },
        secondary: { main: commonColors.secondary, contrastText: '#0F172A' },
        success: { main: commonColors.success },
        warning: { main: commonColors.warning },
        error: { main: commonColors.error },
        info: { main: commonColors.info },
        text: { primary: commonColors.textPrimary, secondary: commonColors.textSecondary },
        divider: 'rgba(30, 41, 59, 0.08)',
        background: { default: commonColors.background, paper: commonColors.paper },
    },
    shape: { borderRadius: 2 },
    typography: {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shadows: [
        'none',
        commonShadows[1],
        commonShadows[2],
        '0 6px 10px 0 rgba(0, 0, 0, 0.1), 0 1px 6px 0 rgba(0, 0, 0, 0.06)',
        commonShadows[4],
        '0 10px 16px -4px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        commonShadows[6],
        '0 16px 24px -4px rgba(0, 0, 0, 0.1), 0 8px 8px -4px rgba(0, 0, 0, 0.04)',
        commonShadows[8],
        ...Array(16).fill('0 25px 50px -12px rgba(0, 0, 0, 0.25)'),
    ],
    components: {
        MuiPaper: {
            styleOverrides: {
                rounded: { borderRadius: 2 },
                elevation1: { boxShadow: commonShadows[1] },
                elevation2: { boxShadow: commonShadows[2] },
            },
        },
        MuiAlert: { styleOverrides: { root: { borderRadius: 2 } } },
        MuiChip: { styleOverrides: { root: { borderRadius: 2 } } },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 2, fontWeight: 600, textTransform: 'none' },
                containedPrimary: {
                    boxShadow: commonShadows[4],
                    '&:hover': { boxShadow: commonShadows[6] },
                },
            },
        },
    },
});

export default theme;
