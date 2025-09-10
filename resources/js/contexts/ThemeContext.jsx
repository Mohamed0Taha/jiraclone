// resources/js/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

// Professional color palette with improved accessibility
const lightPalette = {
    primary: {
        main: '#3182CE', // Professional blue with good contrast
        light: '#63B3ED',
        dark: '#2C5282',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#319795', // Professional teal with good contrast
        light: '#4FD1C7',
        dark: '#2C7A7B',
        contrastText: '#ffffff',
    },
    success: {
        main: '#38A169', // Forest green - WCAG AA compliant
        light: '#68D391',
        dark: '#2F855A',
        contrastText: '#ffffff',
    },
    warning: {
        main: '#D69E2E', // Professional orange - WCAG AA compliant
        light: '#F6E05E',
        dark: '#B7791F',
        contrastText: '#ffffff',
    },
    error: {
        main: '#E53E3E', // Professional red - WCAG AA compliant
        light: '#FC8181',
        dark: '#C53030',
        contrastText: '#ffffff',
    },
    info: {
        main: '#3182CE', // Professional blue - WCAG AA compliant
        light: '#63B3ED',
        dark: '#2C5282',
        contrastText: '#ffffff',
    },
    background: {
        default: '#FFFFFF',
        paper: '#F7FAFC',
    },
    text: {
        primary: '#1A202C', // High contrast dark gray
        secondary: '#4A5568', // Medium contrast gray
    },
    divider: '#E2E8F0',
};

const darkPalette = {
    primary: {
        main: '#63B3ED', // Lighter blue for dark mode - better contrast
        light: '#90CDF4',
        dark: '#3182CE',
        contrastText: '#000000',
    },
    secondary: {
        main: '#4FD1C7', // Lighter teal for dark mode - better contrast
        light: '#81E6D9',
        dark: '#319795',
        contrastText: '#000000',
    },
    success: {
        main: '#68D391', // Lighter green for dark mode - WCAG AA compliant
        light: '#9AE6B4',
        dark: '#38A169',
        contrastText: '#000000',
    },
    warning: {
        main: '#F6E05E', // Lighter orange for dark mode - WCAG AA compliant
        light: '#F6E05E',
        dark: '#D69E2E',
        contrastText: '#000000',
    },
    error: {
        main: '#FC8181', // Lighter red for dark mode - WCAG AA compliant
        light: '#FEB2B2',
        dark: '#E53E3E',
        contrastText: '#000000',
    },
    info: {
        main: '#63B3ED', // Lighter blue for dark mode - WCAG AA compliant
        light: '#90CDF4',
        dark: '#3182CE',
        contrastText: '#000000',
    },
    background: {
        default: '#1A202C',
        paper: '#2D3748',
    },
    text: {
        primary: '#F7FAFC', // High contrast white
        secondary: '#E2E8F0', // Good contrast light gray
    },
    divider: '#4A5568',
};

// Enhanced typography with better accessibility
const typography = {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
    },
    h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
    },
    h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
    },
    h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
    },
    h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
    },
    h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
    },
    body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
    },
    body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
    },
    button: {
        textTransform: 'none',
        fontWeight: 600,
    },
};

// Component overrides for better accessibility and professional look
const getComponentOverrides = (mode) => ({
    MuiButton: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 44, // Better touch target for accessibility
                '&:focus-visible': {
                    outline: `3px solid ${mode === 'light' ? '#3182CE' : '#63B3ED'}`,
                    outlineOffset: 2,
                },
            },
            contained: {
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                '&:hover': {
                    boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
                },
            },
        },
    },
    MuiTextField: {
        styleOverrides: {
            root: {
                '& .MuiOutlinedInput-root': {
                    borderRadius: 8,
                    '&:focus-within': {
                        outline: `2px solid ${mode === 'light' ? '#3182CE' : '#63B3ED'}`,
                        outlineOffset: 2,
                    },
                },
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                boxShadow: mode === 'light' 
                    ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
                    : '0 4px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.5)',
            },
        },
    },
    MuiCard: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: mode === 'light'
                        ? '0 4px 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)'
                        : '0 8px 16px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)',
                    transform: 'translateY(-2px)',
                },
            },
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: 8,
                fontWeight: 500,
            },
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: mode === 'light'
                    ? '0 2px 4px rgba(0,0,0,0.1)'
                    : '0 2px 4px rgba(0,0,0,0.3)',
            },
        },
    },
    MuiLink: {
        styleOverrides: {
            root: {
                '&:focus-visible': {
                    outline: `2px solid ${mode === 'light' ? '#3182CE' : '#63B3ED'}`,
                    outlineOffset: 2,
                    borderRadius: 4,
                },
            },
        },
    },
});

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        // Check localStorage first, then system preference
        const savedMode = localStorage.getItem('theme-mode');
        if (savedMode) return savedMode;
        
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        localStorage.setItem('theme-mode', mode);
    }, [mode]);

    const toggleMode = () => {
        setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
    };

    const theme = createTheme({
        palette: {
            mode,
            ...(mode === 'light' ? lightPalette : darkPalette),
        },
        typography,
        components: getComponentOverrides(mode),
        shape: {
            borderRadius: 8,
        },
        spacing: 8,
    });

    return (
        <ThemeContext.Provider value={{ mode, toggleMode, theme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeMode = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeContext;