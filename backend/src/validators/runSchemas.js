import { z } from 'zod';
import { urlSchema } from './workflowSchemas.js';

export const quickTestSchema = z.strictObject({ url: urlSchema });

export const runIdParamSchema = z.strictObject({
  id: z.string().uuid('Invalid id'),
});

export const screenshotParamSchema = z.strictObject({
  id: z.string().uuid('Invalid id'),
  shotId: z.string().uuid('Invalid id'),
});

export const listRunsQuerySchema = z.strictObject({
  status: z.enum(['queued', 'running', 'passed', 'failed']).optional(),
  type: z.enum(['workflow', 'quick']).optional(),
  workflowId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});