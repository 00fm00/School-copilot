import { z } from 'zod';
import { Role } from '../enums';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  classIds: z.array(z.string()).optional(),
  role: z.nativeEnum(Role).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
