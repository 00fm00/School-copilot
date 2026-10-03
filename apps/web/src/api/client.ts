import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStore } from '../lib/auth-store';
import { AuthResponseDto } from '@school-copilot/shared';

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith('/api')
    ? rawApiUrl
    : `${rawApiUrl}/api`
  : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach in-memory access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for silent single-flight 401 refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid infinite loop on auth endpoints
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      authStore.clearAuth();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = authStore.getRefreshToken();
      const response = await axios.post<AuthResponseDto>(
        `${API_BASE_URL}/auth/refresh`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true },
      );

      const { accessToken, user, refreshToken: newRefreshToken } = response.data;
      authStore.setAuth(accessToken, user, newRefreshToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      processQueue(null, accessToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      authStore.clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return error.message || 'An unexpected server error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
