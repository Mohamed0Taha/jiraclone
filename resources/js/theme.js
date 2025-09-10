// resources/js/theme.js - Updated to work with new theme system
// This file is kept for compatibility but now delegates to our enhanced theme system
import { createTheme } from '@mui/material/styles';

// Import our enhanced theme context
export { useThemeMode } from './contexts/ThemeContext';

// Export a function that creates a theme based on mode
export const createAppTheme = (mode = 'light') => {
    const lightPalette = {
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
        },
        secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2',
        },
        background: {
            default: '#fafafa',
            paper: '#ffffff',
        },
        text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
        },
    };

    const darkPalette = {
        primary: {
            main: '#90caf9',
            light: '#bbdefb',
            dark: '#64b5f6',
        },
        secondary: {
            main: '#ce93d8',
            light: '#e1bee7',
            dark: '#ba68c8',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
        text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
        },
    };

    return createTheme({
        palette: {
            mode,
            ...(mode === 'light' ? lightPalette : darkPalette),
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            button: {
                textTransform: 'none',
                fontWeight: 600,
            },
        },
        shape: {
            borderRadius: 8,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        textTransform: 'none',
                        fontWeight: 600,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                    },
                },
            },
        },
    });
};

// Default export for compatibility
const theme = createAppTheme('light');
export default theme;
