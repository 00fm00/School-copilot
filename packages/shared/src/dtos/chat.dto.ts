import { z } from 'zod';

export const CreateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
