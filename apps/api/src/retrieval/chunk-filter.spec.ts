import { Role } from '@school-copilot/shared';
import { buildChunkFilter } from './chunk-filter';

describe('buildChunkFilter (single source of truth for RAG retrieval permissions)', () => {
  it('should return empty filter for ADMIN role', () => {
    const filter = buildChunkFilter({ role: Role.ADMIN, classIds: [] });
    expect(filter).toEqual({});
  });

  it('should return empty filter for ADMIN even if classIds are passed', () => {
    const filter = buildChunkFilter({
      role: Role.ADMIN,
      classIds: ['class-1', 'class-2'],
    });
    expect(filter).toEqual({});
  });

  it('should restrict TEACHER to role TEACHER and classScope including ALL and assigned classes', () => {
    const filter = buildChunkFilter({
      role: Role.TEACHER,
      classIds: ['class-8a', 'class-10a'],
    });

    expect(filter).toEqual({
      allowedRoles: Role.TEACHER,
      classScope: {
        $in: ['ALL', 'class-8a', 'class-10a'],
      },
    });
  });

  it('should handle TEACHER with no assigned classes by defaulting classScope to ALL only', () => {
    const filter = buildChunkFilter({
      role: Role.TEACHER,
      classIds: [],
    });

    expect(filter).toEqual({
      allowedRoles: Role.TEACHER,
      classScope: {
        $in: ['ALL'],
      },
    });
  });

  it('should restrict PARENT to role PARENT and classScope of their children plus ALL', () => {
    const filter = buildChunkFilter({
      role: Role.PARENT,
      classIds: ['class-6a'],
    });

    expect(filter).toEqual({
      allowedRoles: Role.PARENT,
      classScope: {
        $in: ['ALL', 'class-6a'],
      },
    });
  });

  it('should deduplicate class IDs in classScope', () => {
    const filter = buildChunkFilter({
      role: Role.PARENT,
      classIds: ['class-8a', 'class-8a', 'ALL'],
    });

    expect(filter).toEqual({
      allowedRoles: Role.PARENT,
      classScope: {
        $in: ['ALL', 'class-8a'],
      },
    });
  });
});
