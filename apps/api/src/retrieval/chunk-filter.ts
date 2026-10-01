import { Role } from '@school-copilot/shared';

export interface ChunkFilterUser {
  role: Role;
  classIds?: string[];
}

/**
 * Access rule (single source of truth as required by Section 4).
 * ADMIN gets no filter ({}) - full access across all documents.
 * TEACHER and PARENT get:
 * - allowedRoles contains user's role
 * - classScope in ['ALL', ...userClassIds]
 */
export function buildChunkFilter(user: ChunkFilterUser): Record<string, any> {
  if (user.role === Role.ADMIN) {
    return {};
  }

  const userClassIds = user.classIds || [];
  const allowedClassScopes = Array.from(new Set(['ALL', ...userClassIds]));

  return {
    allowedRoles: user.role,
    classScope: {
      $in: allowedClassScopes,
    },
  };
}
