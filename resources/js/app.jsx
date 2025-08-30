import '../css/app.css';
import './bootstrap';

import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

/* Try to load the MUI theme; if it fails we'll warn and keep going. */
let ThemeProvider = React.Fragment;
let CssBaseline = React.Fragment;
let CircularProgress = () => <div>Loading...</div>;
let theme = null;

// Removed Material-UI theme loading to avoid 404 errors
console.log('Material-UI theme disabled for simulator');

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Loading component for Suspense
const LoadingSpinner = () => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '16px',
        }}
    >
        <CircularProgress />
        <span>Loading...</span>
    </div>
);

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),

    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            theme ? (
                /*  🚫 NO React.StrictMode — prevents double-mount that breaks DnD */
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <Suspense fallback={<LoadingSpinner />}>
                        <App {...props} />
                    </Suspense>
                </ThemeProvider>
            ) : (
                <Suspense fallback={<div>Loading...</div>}>
                    <App {...props} />
                </Suspense>
            )
        );
    },

    progress: {
        color: theme?.palette.primary.main || '#4B5563',
    },
});
