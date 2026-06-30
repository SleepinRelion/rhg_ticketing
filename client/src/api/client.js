const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

let accessToken = null;
let refreshToken = null;
try {
  accessToken = localStorage.getItem('accessToken');
  refreshToken = localStorage.getItem('refreshToken');
} catch (e) {
  console.warn('localStorage is disabled or unavailable.');
}

let onLogout = null;

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  try {
    localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
  } catch (e) {}
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  } catch (e) {}
}

export function setLogoutHandler(fn) {
  onLogout = fn;
}

async function refreshAccessToken() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    accessToken = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
    return true;
  } catch {
    clearTokens();
    if (onLogout) onLogout();
    return false;
  }
}

export async function api(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-cache', // Prevent browser from caching GET requests (fixes hotel switching bug)
    ...options,
  };

  // Remove content-type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let activeHotelId = null;
  try {
    activeHotelId = localStorage.getItem('activeHotelId');
  } catch (e) {}

  if (activeHotelId) {
    config.headers['x-hotel-id'] = activeHotelId;
  }

  let fetchUrl = `${API_BASE}${url}`;
  if (!config.method || config.method.toUpperCase() === 'GET') {
    const delimiter = fetchUrl.includes('?') ? '&' : '?';
    fetchUrl += `${delimiter}_t=${Date.now()}`;
  }

  let res = await fetch(fetchUrl, config);

  // If 401 with expired token, try refresh
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED' && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
        res = await fetch(fetchUrl, config);
      }
    } else if (!url.includes('/auth/login')) {
      clearTokens();
      if (onLogout) onLogout();
      throw new Error(data.error || 'Session expired');
    } else {
      throw new Error(data.error || 'Authentication failed');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'An unexpected error occurred' }));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  // Handle CSV responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return res.blob();
  }

  return res.json();
}

export default api;
