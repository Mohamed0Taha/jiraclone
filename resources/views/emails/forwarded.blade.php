@component('mail::message')
# Forwarded Email

**Original Subject:** {{ $originalSubject }}  
**Original From:** {{ $originalFrom }}  
**Forwarded:** {{ now()->format('F j, Y \a\t g:i A') }}

---

{!! nl2br(e($originalContent)) !!}

---

@if(!empty($originalHeaders))
## Original Headers
@foreach($originalHeaders as $header => $value)
**{{ $header }}:** {{ $value }}  
@endforeach
@endif

This email was automatically forwarded from support@taskpilot.us

@endcomponent
