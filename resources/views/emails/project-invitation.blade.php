@component('mail::message')
# You've been invited to join {{ config('app.name') }}!

Hello!

**{{ $inviter->name }}** has invited you to join **{{ config('app.name') }}** and collaborate on the project **{{ $project->name }}**.

@if($project->description)
**Project Description:**
{{ $project->description }}
@endif

Since you don't have an account yet, you'll need to create one to access the project. Once you sign up, you'll automatically have access to this project.

@component('mail::button', ['url' => $acceptUrl])
Join {{ config('app.name') }} & Access Project
@endcomponent

**What happens next?**
1. Click the button above to create your account
2. The project will automatically appear in your dashboard
3. You can start collaborating immediately!

This invitation will expire in 7 days.

Thanks,<br>
{{ config('app.name') }} Team

---

If you're having trouble clicking the button, copy and paste the URL below into your web browser: {{ $acceptUrl }}
@endcomponent
