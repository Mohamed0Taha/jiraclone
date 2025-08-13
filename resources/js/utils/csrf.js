// resources/js/utils/csrf.js

function readMetaToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    const content = meta.getAttribute('content');
    if (content && content.length > 0) return content;
  }
  return null;
}

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken() {
  const meta = readMetaToken();
  if (meta) return meta;
  const cookie = readCookie('XSRF-TOKEN');
  if (cookie) return cookie;
  return null;
}

export function withCsrf(init = {}) {
  const token = getCsrfToken();
  const baseHeaders = init.headers ? { ...init.headers } : {};
  const headers = {
    ...baseHeaders,
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (token) {
    headers['X-CSRF-TOKEN'] = token;
    headers['X-XSRF-TOKEN'] = token;
  }
  return {
    ...init,
    headers,
    credentials: 'same-origin',
  };
}
