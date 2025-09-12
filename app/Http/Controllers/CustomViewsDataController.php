<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\GenerativeUIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CustomViewsDataController extends Controller
{
    public function __construct(private GenerativeUIService $generativeUIService)
    {
    }

    public function save(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $viewName = $request->input('view_name', 'default');
        $componentCode = $request->input('component_code', '');
        $customViewId = $request->input('custom_view_id');
        $userId = $request->user()->id;

        try {
            if (empty($componentCode)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Component code cannot be empty',
                ], 400);
            }

            $result = $this->generativeUIService->saveCustomView($project, $userId, $viewName, $componentCode, $customViewId);

            return response()->json([
                'success' => true,
                'message' => 'Custom micro-application saved successfully',
                'customViewId' => $result['custom_view_id'],
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('[CustomViewsDataController] save error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error saving custom view: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function saveData(Request $request, Project $project)
    {
        $this->authorize('view', $project);
        $request->headers->set('Accept', 'application/json');

        $viewName = $request->input('view_name', 'default');
        $dataKey = $request->input('data_key', 'default');
        $data = $request->input('data');
        $userId = $request->user()->id;

        try {
            $result = $this->generativeUIService->saveComponentData($project, $userId, $viewName, $dataKey, $data);
            return response()->json([
                'success' => true,
                'message' => 'Component data saved successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('[CustomViewsDataController] saveData error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error saving component data: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function loadData(Request $request, Project $project)
    {
        $this->authorize('view', $project);
        $request->headers->set('Accept', 'application/json');

        $viewName = $request->query('view_name', 'default');
        $dataKey = $request->query('data_key', 'default');
        $userId = $request->user()->id;

        try {
            $result = $this->generativeUIService->loadComponentData($project, $userId, $viewName, $dataKey);
            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('[CustomViewsDataController] loadData error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error loading component data: ' . $e->getMessage(),
            ], 500);
        }
    }
}

