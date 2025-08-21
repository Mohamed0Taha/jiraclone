<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    public function dashboard()
    {
        $stats = [
            'users' => User::count(),
            'projects' => Project::count(), 
            'tasks' => Task::count(),
            'subscriptions' => User::whereNotNull('stripe_id')->count(),
        ];

        return view('admin.dashboard', compact('stats'));
    }

    public function users()
    {
        $users = User::latest()->paginate(20);
        return view('admin.users', compact('users'));
    }

    public function makeAdmin(Request $request, User $user)
    {
        $user->update(['is_admin' => true]);
        return redirect()->back()->with('success', 'User made admin successfully');
    }
}
