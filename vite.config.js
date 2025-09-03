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
    build: {
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
    },
});
