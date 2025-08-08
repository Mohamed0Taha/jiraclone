import "../css/app.css";
import "./bootstrap";

import React from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

/* Try to load the MUI theme; if it fails we’ll warn and keep going. */
let ThemeProvider = React.Fragment;
let CssBaseline   = React.Fragment;
let theme         = null;

try {
    // eslint-disable-next-line import/extensions
    theme = (await import("./theme")).default;
    ({ ThemeProvider, CssBaseline } = await import("@mui/material"));
} catch (err) {
    console.warn(
        "⚠️  MUI theme not applied:",
        err.message,
        "\nRun `npm i @mui/material @mui/icons-material @emotion/react @emotion/styled` " +
            "and ensure resources/js/theme.js exists."
    );
}

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx")
        ),

    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            theme ? (
                /*  🚫 NO React.StrictMode — prevents double-mount that breaks DnD */
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <App {...props} />
                </ThemeProvider>
            ) : (
                <App {...props} />
            )
        );
    },

    progress: {
        color: theme?.palette.primary.main || "#4B5563",
    },
});
