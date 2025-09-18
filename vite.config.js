import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

// IMPORTANT: Do NOT override `base` manually. The Laravel Vite plugin will
// automatically set the correct `/build/` base path in production (and apply
// ASSET_URL when defined). Overriding it to '/' caused dynamic imports to
// request /assets/*.js instead of /build/assets/*.js, leading to 404s.

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/app.jsx',
                'resources/css/app.css',
            ],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        // Ensure a single React instance across all deps (prevents invalid hook calls)
        dedupe: ['react', 'react-dom'],
    },
    // Avoid pre-optimizing optional heavy libs; they are lazy-loaded on demand.
    optimizeDeps: {
        // Avoid prebundling browser-only libs; they are lazy-loaded on demand
        exclude: ['@babel/standalone'],
    },
    // Use Vite/Rollup defaults for code splitting to keep memory usage reasonable
    // during production builds. Forcing a single chunk can lead to OOM (137) on
    // constrained environments.
});
