<?php
return [
    'ssr' => false,
    'root_view' => 'app',
    'version' => function () {
        $m = public_path('build/manifest.json');
        return file_exists($m) ? md5_file($m) : null;
    },
];
