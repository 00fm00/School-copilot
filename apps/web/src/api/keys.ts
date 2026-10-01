export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: (params?: { page?: number; limit?: number }) => ['documents', 'list', params] as const,
    detail: (id: string) => ['documents', 'detail', id] as const,
  },
  classes: {
    all: ['classes'] as const,
  },
  chat: {
    sessions: ['chat', 'sessions'] as const,
    session: (id: string) => ['chat', 'sessions', id] as const,
  },
};
