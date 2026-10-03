import { UserDto } from '@school-copilot/shared';

const ACCESS_TOKEN_KEY = 'school_copilot_access_token';
const REFRESH_TOKEN_KEY = 'school_copilot_refresh_token';
const USER_KEY = 'school_copilot_user';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryUser: UserDto | null = null;

// Initialize tokens and user from localStorage on load to persist session across page refreshes
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    inMemoryAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    inMemoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      inMemoryUser = JSON.parse(storedUser);
    }
  }
} catch {
  // Graceful fallback for environments with restricted storage (e.g., incognito)
}

const listeners = new Set<() => void>();

export const authStore = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  getRefreshToken(): string | null {
    return inMemoryRefreshToken;
  },

  getUser(): UserDto | null {
    return inMemoryUser;
  },

  isAuthenticated(): boolean {
    return inMemoryAccessToken !== null && inMemoryUser !== null;
  },

  setAuth(accessToken: string, user: UserDto, refreshToken?: string) {
    inMemoryAccessToken = accessToken;
    inMemoryUser = user;
    if (refreshToken) {
      inMemoryRefreshToken = refreshToken;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
      }
    } catch {
      // In-memory fallback
    }

    listeners.forEach((listener) => listener());
  },

  clearAuth() {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    inMemoryUser = null;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // In-memory fallback
    }

    listeners.forEach((listener) => listener());
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
