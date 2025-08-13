// resources/js/csrf.js
export function getCsrfToken() {
  // Prefer meta tag in the root Blade
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta?.content) return meta.content;

  // Fallback to XSRF-TOKEN cookie (Laravel writes this for web requests)
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
