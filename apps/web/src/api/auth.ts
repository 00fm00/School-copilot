import { apiClient } from './client';
import { AuthResponseDto, LoginInput, UserDto } from '@school-copilot/shared';
import { authStore } from '../lib/auth-store';

export async function loginUser(credentials: LoginInput): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>('/auth/login', credentials);
  authStore.setAuth(data.accessToken, data.user, data.refreshToken);
  return data;
}

export async function refreshUser(): Promise<AuthResponseDto> {
  const refreshToken = authStore.getRefreshToken();
  const { data } = await apiClient.post<AuthResponseDto>(
    '/auth/refresh',
    refreshToken ? { refreshToken } : {},
  );
  authStore.setAuth(data.accessToken, data.user, data.refreshToken);
  return data;
}

export async function logoutUser(): Promise<{ message: string }> {
  try {
    const refreshToken = authStore.getRefreshToken();
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/logout',
      refreshToken ? { refreshToken } : {},
    );
    return data;
  } finally {
    authStore.clearAuth();
  }
}

export async function getMe(): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>('/auth/me');
  return data;
}
