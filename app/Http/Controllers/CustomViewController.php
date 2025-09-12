<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CustomView;

class CustomViewController extends Controller
{
    public function show(Request $request, int $project, string $view)
    {
        $record = CustomView::where('project_id', $project)
            ->where('view_name', $view)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json([
            'id'   => $record->id,
            'code' => $record->code ?? '',
        ]);
    }

    // Legacy: /projects/{project}/custom-views/get?view_name=NAME
    public function legacyShow(Request $request, int $project)
    {
        $viewName = (string) $request->query('view_name', '');
        if ($viewName === '') {
            return response()->json(['message' => 'Missing view_name'], 422);
        }

        $record = CustomView::where('project_id', $project)
            ->where('view_name', $viewName)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json([
            'id'   => $record->id,
            'code' => $record->code ?? '',
        ]);
    }

    public function upsert(Request $request, int $project, string $view)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $record = CustomView::updateOrCreate(
            ['project_id' => $project, 'view_name' => $view],
            ['code' => $validated['code']]
        );

        return response()->json([
            'id'   => $record->id,
            'code' => $record->code ?? '',
        ], 200);
    }

    public function create(Request $request, int $project)
    {
        $validated = $request->validate([
            'view_name' => 'required|string',
            'code'      => 'required|string',
        ]);

        $record = CustomView::create([
            'project_id' => $project,
            'view_name'  => $validated['view_name'],
            'code'       => $validated['code'],
        ]);

        return response()->json([
            'id'   => $record->id,
            'code' => $record->code ?? '',
        ], 201);
    }

    public function destroy(Request $request, int $project, string $view)
    {
        $record = CustomView::where('project_id', $project)
            ->where('view_name', $view)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $record->delete();
        return response()->json(['ok' => true]);
    }
}
