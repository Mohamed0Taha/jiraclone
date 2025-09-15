<?php

use App\Models\Project;

$project = Project::find(2);
$viewName = 'chatapp';

// Read the component from file
$componentCode = file_get_contents(__DIR__ . '/temp_chat_component.jsx');

echo "\n=== CREATING CUSTOM VIEW ===\n";
$view = $project->customViews()->where('name', $viewName)->first();
if (!$view) {
    $view = $project->customViews()->create([
        'name' => $viewName,
        'component_code' => $componentCode
    ]);
    echo "Created new view: $viewName\n";
} else {
    $view->update(['component_code' => $componentCode]);
    echo "Updated existing view: $viewName\n";
}

// Now embed test data
$testData = [
    'messages' => [
        [
            'id' => 1726366800000,
            'text' => 'Welcome to the team chat! This message should persist across page reloads and be visible to all team members.',
            'author' => 'system',
            'timestamp' => '9/15/2025, 3:00:00 AM'
        ]
    ],
    'lastUpdated' => date('c')
];

echo "\n=== EMBEDDING TEST DATA ===\n";
$embedData = ['chat-messages' => $testData];
$embedDataCode = "\nconst __EMBEDDED_DATA__ = " . json_encode($embedData, JSON_PRETTY_PRINT) . ";\n\n";
$updatedCode = $embedDataCode . $componentCode;

$view->update(['component_code' => $updatedCode]);
echo "✅ Data embedded successfully\n";

echo "\n=== VERIFICATION ===\n";
$view->refresh();
echo "Component code length: " . strlen($view->component_code) . " chars\n";
echo "Has embedded data: " . (strpos($view->component_code, '__EMBEDDED_DATA__') !== false ? 'YES' : 'NO') . "\n";
echo "Has useEmbeddedData: " . (strpos($view->component_code, 'useEmbeddedData') !== false ? 'YES' : 'NO') . "\n";