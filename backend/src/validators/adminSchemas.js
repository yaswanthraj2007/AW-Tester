import { z } from 'zod';

export const updateUserSchema = z
  .strictObject({
    role: z.enum(['user', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => v.role !== undefined || v.isActive !== undefined,
    'Provide role and/or isActive'
  );

export const listUsersQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const adminRunsQuerySchema = z.strictObject({
  status: z.enum(['queued', 'running', 'passed', 'failed']).optional(),
  type: z.enum(['workflow', 'quick']).optional(),
  ownerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});