import { v4 as uuid } from 'uuid';

// TODO(MySQL): `runs` table (id, owner_id, workflow_id NULL, workflow_name, type, target_url,
// status, error, settings JSON, plan JSON, quick JSON, console_errors JSON, blocked_hosts JSON,
// created_at, started_at, finished_at, duration_ms) and a `run_steps` table
// (run_id, position, step_id, action, description, status, duration_ms, error, screenshot_id).
// Index (owner_id, created_at). Every single-run read must include owner_id (or be an admin read).
const runs = new Map();
let counter = 0; // reliable newest-first ordering, even within the same millisecond

const RUN_UPDATABLE = new Set([
  'status', 'error', 'startedAt', 'finishedAt', 'durationMs',
  'consoleErrors', 'blockedHosts', 'quick',
]);
const STEP_UPDATABLE = new Set(['status', 'durationMs', 'error', 'screenshotId']);

export const runStore = {
  create(data) {
    const run = {
      ...data,
      id: uuid(),
      seq: ++counter,
      status: 'queued',
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      consoleErrors: [],
      blockedHosts: [],
      quick: null,
    };
    runs.set(run.id, run);
    return run;
  },

  findById(id) {
    return runs.get(id) || null;
  },

  update(id, patch) {
    const run = runs.get(id);
    if (!run) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (RUN_UPDATABLE.has(key)) run[key] = value;
    }
    return run;
  },

  updateStep(id, index, patch) {
    const step = runs.get(id)?.steps[index];
    if (!step) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (STEP_UPDATABLE.has(key)) step[key] = value;
    }
    return step;
  },

  listByOwner(ownerId) {
    return [...runs.values()].filter((r) => r.ownerId === ownerId).sort((a, b) => b.seq - a.seq);
  },

  listAll() {
    return [...runs.values()].sort((a, b) => b.seq - a.seq);
  },
  
    countByOwner(ownerId) {
    let count = 0;
    for (const r of runs.values()) if (r.ownerId === ownerId) count++;
    return count;
  },

  delete(id) {
    return runs.delete(id);
  },
};