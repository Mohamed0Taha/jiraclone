import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Make route function available globally if it exists
if (window.Ziggy) {
    const { route } = await import('ziggy-js');
    window.route = route;
}
