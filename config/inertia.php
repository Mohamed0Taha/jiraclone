<?php

return [
    'ssr' => false,

    // IMPORTANT: tell Inertia which Blade view to render
    'root_view' => 'app',

    // cache-busting; ok if manifest not present locally
    'version' => function () {
        $manifest = public_path('build/manifest.json');
        return file_exists($manifest) ? md5_file($manifest) : null;
    },
];
