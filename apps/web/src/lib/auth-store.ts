import { UserDto } from '@school-copilot/shared';

// Module-level in-memory storage (never stored in localStorage as per security specification)
let inMemoryAccessToken: string | null = null;
let inMemoryUser: UserDto | null = null;
const listeners = new Set<() => void>();

export const authStore = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  getUser(): UserDto | null {
    return inMemoryUser;
  },

  isAuthenticated(): boolean {
    return inMemoryAccessToken !== null && inMemoryUser !== null;
  },

  setAuth(accessToken: string, user: UserDto) {
    inMemoryAccessToken = accessToken;
    inMemoryUser = user;
    listeners.forEach((listener) => listener());
  },

  clearAuth() {
    inMemoryAccessToken = null;
    inMemoryUser = null;
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
