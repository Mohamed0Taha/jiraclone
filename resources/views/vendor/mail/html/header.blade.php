@props(['url'])
<tr>
<td class="header" style="padding:24px 0;">
    <a href="{{ $url }}" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;">
        <img src="{{ rtrim(config('app.url'), '/') }}/images/logo-email.png"
             alt="{{ config('app.name') }}" width="36" height="36"
             style="display:block;border-radius:8px;">
        <span style="font-weight:700;letter-spacing:.2px;color:#111827;">
            {{ config('app.name') }}
        </span>
    </a>
</td>
</tr>
