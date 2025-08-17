@component('mail::message')
# You've been added to a project!

Hello {{ $user->name }}!

**{{ $addedBy->name }}** has added you to the project **{{ $project->name }}**. You now have access to this project and it will appear in your dashboard.

@if($project->description)
**Project Description:**
{{ $project->description }}
@endif

@component('mail::button', ['url' => $projectUrl])
View Project
@endcomponent

You can also see all your projects in your dashboard:

@component('mail::button', ['url' => $dashboardUrl, 'color' => 'secondary'])
Go to Dashboard
@endcomponent

Welcome to the team!

Thanks,<br>
{{ config('app.name') }}
@endcomponent
