import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from './auth-store';
import { Role } from '@school-copilot/shared';

describe('authStore', () => {
  beforeEach(() => {
    authStore.clearAuth();
  });

  it('should initialize empty and unauthenticated', () => {
    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getUser()).toBeNull();
    expect(authStore.isAuthenticated()).toBe(false);
  });

  it('should store token and user in memory', () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@school.local',
      name: 'Admin',
      role: Role.ADMIN,
      classIds: [],
      isActive: true,
    };

    authStore.setAuth('jwt-token-xyz', mockUser);

    expect(authStore.getAccessToken()).toBe('jwt-token-xyz');
    expect(authStore.getUser()).toEqual(mockUser);
    expect(authStore.isAuthenticated()).toBe(true);
  });

  it('should notify subscribers on auth changes', () => {
    let callCount = 0;
    const unsubscribe = authStore.subscribe(() => {
      callCount++;
    });

    authStore.setAuth('token-1', {
      id: '1',
      email: 'a@a.com',
      name: 'A',
      role: Role.PARENT,
      classIds: [],
      isActive: true,
    });
    expect(callCount).toBe(1);

    authStore.clearAuth();
    expect(callCount).toBe(2);

    unsubscribe();
    authStore.clearAuth();
    expect(callCount).toBe(2);
  });
});
