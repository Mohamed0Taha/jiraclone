<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    use AuthorizesRequests;

    /**
     * Store a new comment for a task
     */
    public function store(Request $request, Project $project, Task $task): RedirectResponse
    {
        // Authorize task access through project policy
        $this->authorize('view', $project);

        $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        // If parent_id is provided, make sure it belongs to the same task
        if ($request->parent_id) {
            $parentComment = Comment::find($request->parent_id);
            if (! $parentComment || $parentComment->task_id !== $task->id) {
                return back()->withErrors(['parent_id' => 'Invalid parent comment.']);
            }
        }

        $task->comments()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $request->parent_id,
            'content' => $request->content,
        ]);

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
