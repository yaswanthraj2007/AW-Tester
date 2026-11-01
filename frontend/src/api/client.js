import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

// A 401 on these means "bad credentials" or "no session", not "token expired"
const NO_REFRESH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/csrf', '/auth/logout'];

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

// ---------- CSRF ----------
let csrfToken = null;
let csrfRequest = null;

const fetchCsrfToken = () => {
  if (!csrfRequest) {
    csrfRequest = api
      .get('/auth/csrf')
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
};

api.interceptors.request.use(async (config) => {
  config._startedAt = Date.now();
  if (!SAFE_METHODS.has((config.method || 'get').toLowerCase())) {
    config.headers.set('X-CSRF-Token', csrfToken || (await fetchCsrfToken()));
  }
  return config;
});

// ---------- Session refresh ----------
let refreshRequest = null; // single flight: everyone waits on the same refresh
let lastRefreshAt = 0;
let sessionExpiredHandler = null;

export const setSessionExpiredHandler = (fn) => {
  sessionExpiredHandler = fn;
};

const refreshSession = () => {
  if (!refreshRequest) {
    refreshRequest = api
      .post('/auth/refresh')
      .then(() => {
        lastRefreshAt = Date.now();
      })
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
};

api.interceptors.response.use(
  (response) => {
    // login, signup, refresh and change-password return a fresh CSRF token
    if (response.data?.csrfToken) csrfToken = response.data.csrfToken;
    return response;
  },
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    if (!config || !status) return Promise.reject(error); // network error, timeout, cancelled

    // 1) CSRF token out of date (another tab logged in or out): fetch a new one, retry once
    if (status === 403 && error.response.data?.code === 'CSRF_INVALID' && !config._csrfRetried) {
      config._csrfRetried = true;
      csrfToken = null;
      return api.request(config);
    }

    // 2) Access token expired: refresh once, retry once
    const path = config.url || '';
    const isRefreshable = status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

    if (isRefreshable) {
      if (config._authRetried) {
        // Still 401 right after a fresh refresh, so the account was disabled or removed
        sessionExpiredHandler?.();
        return Promise.reject(error);
      }
      config._authRetried = true;

      try {
        // Skip the refresh if another request already refreshed after this one was sent
        if (config._startedAt > lastRefreshAt) await refreshSession();
      } catch (refreshError) {
        const s = refreshError.response?.status;
        if (s === 401 || s === 403) sessionExpiredHandler?.();
        return Promise.reject(error);
      }
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

// ---------- Error helpers ----------
export const getErrorMessages = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error.response) return ['Cannot reach the server. Check your connection and try again.'];
  const data = error.response.data;
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors.map((e) => e.message);
  if (typeof data?.message === 'string') return [data.message];
  return [fallback];
};

// { fieldName: 'message' } for forms that show errors next to inputs (used in later steps)
export const getFieldErrors = (error) => {
  const out = {};
  for (const e of error.response?.data?.errors ?? []) {
    if (e.field && !out[e.field]) out[e.field] = e.message;
  }
  return out;
};