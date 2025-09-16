<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Custom view data updates channel
Broadcast::channel('custom-view.{projectId}.{viewName}', function ($user, $projectId, $viewName) {
    // Allow authenticated users to listen to custom view updates for projects they can access
    return $user && $user->can('view', \App\Models\Project::find($projectId));
});