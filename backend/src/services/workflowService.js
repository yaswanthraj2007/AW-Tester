import { v4 as uuid } from 'uuid';

export const MAX_WORKFLOWS_PER_USER = 100;

export const DEFAULT_SETTINGS = {
  browser: 'chromium',
  headless: true, // Step 5 forces headless on a production server
  viewport: { width: 1280, height: 720 },
  defaultTimeout: 10000,
  continueOnFailure: false,
};

// Turns validated input into the object we store: fresh step ids, settings with defaults
export const buildWorkflowData = (input) => ({
  name: input.name,
  description: input.description ?? '',
  targetUrl: input.targetUrl,
  steps: (input.steps ?? []).map(({ id, ...step }) => ({ id: uuid(), ...step })),
  settings: {
    ...DEFAULT_SETTINGS,
    ...(input.settings ?? {}),
    viewport: { ...(input.settings?.viewport ?? DEFAULT_SETTINGS.viewport) },
  },
});

// Explicit allow-list of what leaves the server
export const toPublicWorkflow = (w) => ({
  id: w.id,
  ownerId: w.ownerId,
  name: w.name,
  description: w.description,
  targetUrl: w.targetUrl,
  steps: structuredClone(w.steps),
  settings: structuredClone(w.settings),
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});
export { assertWorkflowUrlsAllowed } from '../validators/workflowSchemas.js';
