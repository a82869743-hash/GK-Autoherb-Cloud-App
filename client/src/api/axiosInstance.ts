import axios from 'axios';

// ─── Safety Guard: Prevent local dev from hitting production API ─────
const apiUrl = import.meta.env.VITE_API_URL || '/api';
if (import.meta.env.DEV && apiUrl.includes('gkautobook.cloud')) {
  console.error(
    '%c🚨 SAFETY BLOCK: Your VITE_API_URL points to PRODUCTION!',
    'color: red; font-size: 18px; font-weight: bold;'
  );
  console.error(
    '%cYou are running locally but your client/.env has VITE_API_URL pointing to the live server.\n' +
    'This would cause your local changes to modify PRODUCTION data.\n\n' +
    'FIX: Change VITE_API_URL=/api in your client/.env file',
    'color: orange; font-size: 14px;'
  );
  throw new Error('BLOCKED: Cannot use production API URL in development mode. Set VITE_API_URL=/api in client/.env');
}

const api = axios.create({
  baseURL: apiUrl,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  try {
    // Try sessionStorage first, fall back to localStorage for migration
    const stored = sessionStorage.getItem('gk-auth-v1') || localStorage.getItem('gk-auth-v1');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
    }
  } catch {
    // Ignore parse errors
  }
  return config;
});

// Response interceptor — auto-logout on 401, friendly error messages
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Network error (server down / no connection)
    if (!err.response) {
      err.message = 'Unable to connect to server. Please check your connection.';
      return Promise.reject(err);
    }

    // Auto-logout on 401 (token expired/invalid)
    if (err.response.status === 401) {
      sessionStorage.removeItem('gk-auth-v1');
      localStorage.removeItem('gk-auth-v1');
      // Only redirect if not already on login/register
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
