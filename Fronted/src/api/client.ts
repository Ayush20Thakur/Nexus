import axios from 'axios';

// Backend API client for the NEXUS FastAPI service.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the Supabase JWT when available.
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('nexus-auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Stored auth state is optional; malformed state falls back to an anonymous request.
    }
  }
  return config;
});

// Expired or invalid sessions return the user to login.
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nexus-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
