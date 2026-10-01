import { z } from 'zod';
import { Role } from '../enums';

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  audienceRoles: z.array(z.nativeEnum(Role)).min(1, 'Select at least one audience role'),
  classScope: z.array(z.string()).min(1, 'Select at least one class or ALL'),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  audienceRoles: z.array(z.nativeEnum(Role)).min(1).optional(),
  classScope: z.array(z.string()).min(1).optional(),
});

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
