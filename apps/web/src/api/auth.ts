import { apiClient } from './client';
import { AuthResponseDto, LoginInput, UserDto } from '@school-copilot/shared';
import { authStore } from '../lib/auth-store';

export async function loginUser(credentials: LoginInput): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>('/auth/login', credentials);
  authStore.setAuth(data.accessToken, data.user);
  return data;
}

export async function refreshUser(): Promise<AuthResponseDto> {
  const { data } = await apiClient.post<AuthResponseDto>('/auth/refresh');
  authStore.setAuth(data.accessToken, data.user);
  return data;
}

export async function logoutUser(): Promise<{ message: string }> {
  try {
    const { data } = await apiClient.post<{ message: string }>('/auth/logout');
    return data;
  } finally {
    authStore.clearAuth();
  }
}

export async function getMe(): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>('/auth/me');
  return data;
}
