@props(['url'])
<tr>
  <td class="header" style="padding:24px 0;">
    <a href="{{ $url }}" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#6366F1;color:#ffffff;font-weight:800;font-size:12px;font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';">
        {{ \Illuminate\Support\Str::of(config('app.name'))->substr(0, 1) }}
      </span>
      <span style="font-weight:600;letter-spacing:.2px;color:#1E293B;">
        {{ config('app.name') }}
      </span>
    </a>
  </td>
</tr>