// resources/js/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

// Professional color palette with accessibility in mind
const lightPalette = {
    primary: {
        main: '#1976d2', // Professional blue
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#9c27b0', // Professional purple
        light: '#ba68c8',
        dark: '#7b1fa2',
        contrastText: '#ffffff',
    },
    success: {
        main: '#2e7d32', // Accessible green
        light: '#4caf50',
        dark: '#1b5e20',
        contrastText: '#ffffff',
    },
    warning: {
        main: '#ed6c02', // Accessible orange
        light: '#ff9800',
        dark: '#e65100',
        contrastText: '#ffffff',
    },
    error: {
        main: '#d32f2f', // Accessible red
        light: '#f44336',
        dark: '#c62828',
        contrastText: '#ffffff',
    },
    info: {
        main: '#0288d1', // Accessible blue
        light: '#03a9f4',
        dark: '#01579b',
        contrastText: '#ffffff',
    },
    background: {
        default: '#fafafa',
        paper: '#ffffff',
    },
    text: {
        primary: 'rgba(0, 0, 0, 0.87)', // High contrast
        secondary: 'rgba(0, 0, 0, 0.6)', // Good contrast
    },
    divider: 'rgba(0, 0, 0, 0.12)',
};

const darkPalette = {
    primary: {
        main: '#90caf9', // Lighter blue for dark mode
        light: '#bbdefb',
        dark: '#64b5f6',
        contrastText: '#000000',
    },
    secondary: {
        main: '#ce93d8', // Lighter purple for dark mode
        light: '#e1bee7',
        dark: '#ba68c8',
        contrastText: '#000000',
    },
    success: {
        main: '#66bb6a', // Accessible green for dark mode
        light: '#81c784',
        dark: '#4caf50',
        contrastText: '#000000',
    },
    warning: {
        main: '#ffb74d', // Accessible orange for dark mode
        light: '#ffcc02',
        dark: '#ffa726',
        contrastText: '#000000',
    },
    error: {
        main: '#f44336', // Accessible red for dark mode
        light: '#e57373',
        dark: '#d32f2f',
        contrastText: '#ffffff',
    },
    info: {
        main: '#29b6f6', // Accessible blue for dark mode
        light: '#4fc3f7',
        dark: '#0288d1',
        contrastText: '#000000',
    },
    background: {
        default: '#121212',
        paper: '#1e1e1e',
    },
    text: {
        primary: '#ffffff', // High contrast white
        secondary: 'rgba(255, 255, 255, 0.7)', // Good contrast
    },
    divider: 'rgba(255, 255, 255, 0.12)',
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
                minHeight: 44, // Better touch target
                '&:focus-visible': {
                    outline: `2px solid ${mode === 'light' ? '#1976d2' : '#90caf9'}`,
                    outlineOffset: 2,
                },
            },
            contained: {
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
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
                        outline: `2px solid ${mode === 'light' ? '#1976d2' : '#90caf9'}`,
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