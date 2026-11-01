import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { createUrlGuard } from '../utils/ssrf.js';

// Control characters (except tab, newline, carriage return) have no place in
// user text and can be used to confuse logs and downstream tools.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const noControlChars = (s) => !CONTROL_CHARS.test(s);
const INVALID_CHARS = 'Contains invalid characters';

// Trimmed text with length limits
const text = (max, { min = 0 } = {}) => {
  let s = z.string().trim().max(max, `Must be at most ${max} characters`);
  if (min > 0) s = s.min(min, 'This field is required');
  return s.refine(noControlChars, INVALID_CHARS);
};

// Text that must keep its exact value (for example what a "fill" step types)
const rawText = (max) =>
  z.string().max(max, `Must be at most ${max} characters`).refine(noControlChars, INVALID_CHARS);

// Only absolute http(s) URLs, with no embedded credentials.
// Private/internal address blocking (SSRF) is added in Step 5, where DNS is resolved.
const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
  } catch {
    return false;
  }
};

export const urlSchema = z
  .string()
  .trim()
  .max(2048, 'URL is too long')
  .refine(isHttpUrl, 'Must be a valid http or https URL without a username or password');

const ALLOWED_KEYS = [
  'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown',
];

const selector = text(300, { min: 1 });

// The frontend may send an id for a step. We accept it and ignore it,
// because the server assigns fresh ids on every save.
const stepBase = { id: z.string().max(64).optional() };

export const stepSchema = z.discriminatedUnion('action', [
  z.strictObject({ ...stepBase, action: z.literal('goto'), url: urlSchema }),
  z.strictObject({ ...stepBase, action: z.literal('click'), selector }),
  z.strictObject({ ...stepBase, action: z.literal('fill'), selector, value: rawText(1000) }),
  z.strictObject({ ...stepBase, action: z.literal('select'), selector, option: text(200, { min: 1 }) }),
  z.strictObject({ ...stepBase, action: z.literal('press'), selector, key: z.enum(ALLOWED_KEYS) }),
  z.strictObject({
    ...stepBase,
    action: z.literal('waitForSelector'),
    selector,
    timeout: z.number().int().min(100).max(30000).optional(),
  }),
  z.strictObject({ ...stepBase, action: z.literal('assertText'), selector, expected: text(500, { min: 1 }) }),
  z.strictObject({ ...stepBase, action: z.literal('assertVisible'), selector }),
  z.strictObject({ ...stepBase, action: z.literal('assertUrl'), expected: text(2048, { min: 1 }) }),
  z.strictObject({
    ...stepBase,
    action: z.literal('screenshot'),
    name: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9 _-]{1,50}$/, 'Use 1-50 letters, numbers, spaces, dashes or underscores'),
  }),
]);

const viewportSchema = z.strictObject({
  width: z.number().int().min(320).max(3840),
  height: z.number().int().min(320).max(2160),
});

const settingsSchema = z.strictObject({
  browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  headless: z.boolean().optional(),
  viewport: viewportSchema.optional(),
  defaultTimeout: z.number().int().min(1000).max(30000).optional(),
  continueOnFailure: z.boolean().optional(),
});

// Used for both create (POST) and full replace (PUT).
// There is no ownerId or id here, so a client can never set them.
export const workflowSchema = z.strictObject({
  name: text(100, { min: 1 }),
  description: text(500).optional(),
  targetUrl: urlSchema,
  steps: z.array(stepSchema).max(50, 'A workflow can have at most 50 steps').optional(),
  settings: settingsSchema.optional(),
});

export const idParamSchema = z.strictObject({
  id: z.string().uuid('Invalid id'),
});
// Rejects workflows whose target URL or goto steps point at private/internal addresses.
// A host that simply fails to resolve is allowed on save (the site may be temporarily down).
export const assertWorkflowUrlsAllowed = async (data) => {
  const urls = new Set([
    data.targetUrl,
    ...data.steps.filter((s) => s.action === 'goto').map((s) => s.url),
  ]);
  const guard = createUrlGuard();

  for (const url of urls) {
    const verdict = await guard.check(url);
    if (!verdict.ok && verdict.code === 'PRIVATE') {
      throw new AppError(400, verdict.reason);
    }
  }
};