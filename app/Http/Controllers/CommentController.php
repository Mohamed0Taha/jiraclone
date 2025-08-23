<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\CommentAttachment;
use App\Models\Project;
use App\Models\Task;
use App\Services\ImageKitService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Store a new comment for a task
     */
    public function store(Request $request, Project $project, Task $task, ImageKitService $imageKit): RedirectResponse
    {
        // Authorize task access through project policy
        $this->authorize('view', $project);

        $request->validate([
            'content' => 'required_without:image|nullable|string|max:2000',
            'image' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp|max:5120',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        // If parent_id is provided, make sure it belongs to the same task
        if ($request->parent_id) {
            $parentComment = Comment::find($request->parent_id);
            if (! $parentComment || $parentComment->task_id !== $task->id) {
                return back()->withErrors(['parent_id' => 'Invalid parent comment.']);
            }
        }

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $request->parent_id,
            'content' => $request->content ?? '',
        ]);

        if ($request->hasFile('image')) {
            try {
                $upload = $imageKit->upload($request->file('image'), 'task-comments');
                CommentAttachment::create([
                    'comment_id' => $comment->id,
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
            } catch (\Throwable $e) {
                return back()->withErrors(['image' => 'Image upload failed: '.$e->getMessage()]);
            }
        }

        return back()->with('success', 'Comment added successfully.');
    }

    /**
     * Update an existing comment
     */
    public function update(Request $request, Project $project, Task $task, Comment $comment): RedirectResponse
    {
        // Authorize task access through project policy
        $this->authorize('view', $project);

        // Ensure comment belongs to this task
        if ($comment->task_id !== $task->id) {
            abort(404, 'Comment not found for this task.');
        }

        // Only the comment author can edit their comment
        if ($comment->user_id !== $request->user()->id) {
            abort(403, 'You can only edit your own comments.');
        }

        $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        $comment->update([
            'content' => $request->content,
        ]);

        return back()->with('success', 'Comment updated successfully.');
    }

    /**
     * Delete a comment
     */
    public function destroy(Request $request, Project $project, Task $task, Comment $comment): RedirectResponse
    {
        // Authorize task access through project policy
        $this->authorize('view', $project);

        // Ensure comment belongs to this task
        if ($comment->task_id !== $task->id) {
            abort(404, 'Comment not found for this task.');
        }

        // Only the comment author can delete their comment
        if ($comment->user_id !== $request->user()->id) {
            abort(403, 'You can only delete your own comments.');
        }

        $comment->delete();

        return back()->with('success', 'Comment deleted successfully.');
    }
}
