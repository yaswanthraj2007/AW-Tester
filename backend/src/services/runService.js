import fs from 'fs/promises';
import path from 'path';
import { runStore } from '../store/runStore.js';
import { SCREENSHOT_ROOT } from '../config/paths.js';

export const MAX_RUNS_PER_USER = 50;

export const QUICK_SETTINGS = {
  browser: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 720 },
  defaultTimeout: 20000,
  continueOnFailure: false,
};

export const describeStep = (s) => {
  switch (s.action) {
    case 'goto': return `Go to ${s.url}`;
    case 'click': return `Click ${s.selector}`;
    case 'fill': return `Fill ${s.selector}`; // value intentionally omitted
    case 'select': return `Select "${s.option}" in ${s.selector}`;
    case 'press': return `Press ${s.key} on ${s.selector}`;
    case 'waitForSelector': return `Wait for ${s.selector}`;
    case 'assertText': return `Assert ${s.selector} contains "${s.expected}"`;
    case 'assertVisible': return `Assert ${s.selector} is visible`;
    case 'assertUrl': return `Assert URL contains "${s.expected}"`;
    case 'screenshot': return `Take screenshot "${s.name}"`;
    default: return s.action;
  }
};

// The run keeps a snapshot ("plan") of the steps, so editing the workflow
// while a run is in progress cannot change what that run does.
export const buildWorkflowRunRecord = (workflow) => ({
  ownerId: workflow.ownerId,
  workflowId: workflow.id,
  workflowName: workflow.name,
  type: 'workflow',
  targetUrl: workflow.targetUrl,
  settings: structuredClone(workflow.settings),
  plan: structuredClone(workflow.steps),
  steps: workflow.steps.map((s, index) => ({
    index,
    id: s.id,
    action: s.action,
    description: describeStep(s),
    status: 'pending',
    durationMs: null,
    error: null,
    screenshotId: null,
  })),
});

export const buildQuickRunRecord = (ownerId, url) => ({
  ownerId,
  workflowId: null,
  workflowName: 'Quick test',
  type: 'quick',
  targetUrl: url,
  settings: structuredClone(QUICK_SETTINGS),
  plan: [],
  steps: [],
});

const countSteps = (run) => {
  const counts = { total: run.steps.length, passed: 0, failed: 0, skipped: 0 };
  for (const s of run.steps) if (s.status in counts) counts[s.status]++;
  return counts;
};

// Explicit allow-lists of what leaves the server (the internal "plan" never does)
export const toRunSummary = (run) => ({
  id: run.id,
  workflowId: run.workflowId,
  workflowName: run.workflowName,
  type: run.type,
  targetUrl: run.targetUrl,
  status: run.status,
  error: run.error,
  createdAt: run.createdAt,
  startedAt: run.startedAt,
  finishedAt: run.finishedAt,
  durationMs: run.durationMs,
  counts: countSteps(run),
});

export const toPublicRun = (run) => ({
  ...toRunSummary(run),
  settings: structuredClone(run.settings),
  steps: run.steps.map((s) => ({
    index: s.index,
    id: s.id,
    action: s.action,
    description: s.description,
    status: s.status,
    durationMs: s.durationMs,
    error: s.error,
    screenshotId: s.screenshotId,
  })),
  quick: run.quick ? structuredClone(run.quick) : null,
  consoleErrors: [...run.consoleErrors],
  blockedHosts: [...run.blockedHosts],
});

// Keeps the newest MAX_RUNS_PER_USER runs and deletes the rest with their screenshots
export const pruneRuns = async (ownerId) => {
  const mine = runStore.listByOwner(ownerId);
  for (const old of mine.slice(MAX_RUNS_PER_USER)) {
    runStore.delete(old.id);
    await fs.rm(path.join(SCREENSHOT_ROOT, old.id), { recursive: true, force: true });
  }
};