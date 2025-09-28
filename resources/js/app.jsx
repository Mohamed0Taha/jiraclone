import '../css/app.css';
import './bootstrap';
import 'react-calendar-timeline/dist/style.css';

import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { CircularProgress, Box, Typography } from '@mui/material';

// Import our enhanced theme and i18n setup
import { ThemeProvider } from './contexts/ThemeContext';
import './i18n';

// Suppress React Beautiful DND defaultProps warning in development
if (import.meta.env.DEV) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        if (args[0]?.includes?.('Support for defaultProps will be removed from memo components') && 
            args[0]?.includes?.('react-beautiful-dnd')) {
            return; // Suppress this specific warning
        }
        originalWarn.apply(console, args);
    };
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Enhanced loading component for Suspense
const LoadingSpinner = () => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: 2,
        }}
    >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
            Loading...
        </Typography>
    </Box>
);

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),

    setup({ el, App, props }) {
        // Prevent double-initialization warning by caching the root
        let root = el.__inertiaReactRoot || null;
        if (!root) {
            root = createRoot(el);
            el.__inertiaReactRoot = root;
        }

        root.render(
            <ThemeProvider>
                <Suspense fallback={<LoadingSpinner />}>
                    <App {...props} />
                </Suspense>
            </ThemeProvider>
        );
    },

    progress: {
        color: '#1976d2', // Use our professional blue
    },
});
