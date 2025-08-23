<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Services\ImageKitService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskAttachmentController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Project $project, Task $task, ImageKitService $imageKit): RedirectResponse
    {
        $this->authorize('view', $project);

        $request->validate([
            'image' => 'required|file|mimes:jpg,jpeg,png,gif,webp|max:5120',
        ]);

        try {
            $upload = $imageKit->upload($request->file('image'), 'task-covers');
        } catch (\Throwable $e) {
            return back()->withErrors(['image' => 'Upload failed: '.$e->getMessage()]);
        }

        TaskAttachment::create([
            'task_id' => $task->id,
            'user_id' => $request->user()->id,
            'kind' => 'image',
            'original_name' => $request->file('image')->getClientOriginalName(),
            'mime_type' => $request->file('image')->getMimeType(),
            'size' => $request->file('image')->getSize(),
            'imagekit_file_id' => $upload['file_id'] ?? null,
            'url' => $upload['url'] ?? null,
            'meta' => [
                'width' => $upload['width'] ?? null,
                'height' => $upload['height'] ?? null,
                'thumbnail_url' => $upload['thumbnail_url'] ?? null,
            ],
        ]);

        return back()->with('success', 'Image added to task.');
    }

    public function destroy(Request $request, Project $project, Task $task, TaskAttachment $attachment): RedirectResponse
    {
        $this->authorize('view', $project);

        if ($attachment->task_id !== $task->id) {
            abort(404);
        }
        if ($attachment->user_id !== $request->user()->id) {
            abort(403);
        }

        $attachment->delete();

        return back()->with('success', 'Attachment removed.');
    }
}
