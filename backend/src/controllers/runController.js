import { workflowStore } from '../store/workflowStore.js';
import { runStore } from '../store/runStore.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadAccessible } from './workflowController.js';
import { enqueue } from '../services/runQueue.js';
import { executeRun } from '../services/playwrightRunner.js';
import {
  buildWorkflowRunRecord,
  buildQuickRunRecord,
  toPublicRun,
  toRunSummary,
} from '../services/runService.js';
import { checkUrl } from '../utils/ssrf.js';
import { SCREENSHOT_ROOT } from '../config/paths.js';

// Queues the run. If the queue refuses it (429/503), the run record is removed.
const queueRun = (userId, runId) => {
  try {
    enqueue(userId, () => executeRun(runId));
  } catch (err) {
    runStore.delete(runId);
    throw err;
  }
};

// Same 404 for "does not exist" and "belongs to someone else". Admins may read any run.
const loadRunAccessible = (req) => {
  const run = runStore.findById(req.validated.params.id);
  const allowed = run && (run.ownerId === req.user.id || req.user.role === 'admin');
  if (!allowed) throw new AppError(404, 'Run not found');
  return run;
};

// POST /api/workflows/:id/run   (owner only)
export const startWorkflowRun = (req, res) => {
  const workflow = loadAccessible(req);
  if (workflow.steps.length === 0) {
    throw new AppError(400, 'Add at least one step before running this workflow.');
  }
  const run = runStore.create(buildWorkflowRunRecord(workflow));
  queueRun(req.user.id, run.id);
  res.status(202).json({ run: toPublicRun(run) });
};

// POST /api/quick-test
export const startQuickTest = asyncHandler(async (req, res) => {
  const { url } = req.validated.body;

  const verdict = await checkUrl(url);
  if (!verdict.ok && verdict.code === 'PRIVATE') throw new AppError(400, verdict.reason);

  const run = runStore.create(buildQuickRunRecord(req.user.id, url));
  queueRun(req.user.id, run.id);
  res.status(202).json({ run: toPublicRun(run) });
});

// GET /api/runs
export const listRuns = (req, res) => {
  const { status, type, workflowId, page = 1, limit = 20 } = req.validated.query;

  let runs = runStore.listByOwner(req.user.id);
  if (status) runs = runs.filter((r) => r.status === status);
  if (type) runs = runs.filter((r) => r.type === type);
  if (workflowId) runs = runs.filter((r) => r.workflowId === workflowId);

  const total = runs.length;
  const items = runs.slice((page - 1) * limit, page * limit).map(toRunSummary);
  res.json({ runs: items, total, page, limit });
};

// GET /api/runs/stats
export const getStats = (req, res) => {
  const runs = runStore.listByOwner(req.user.id); // newest first
  const finished = runs.filter((r) => r.status === 'passed' || r.status === 'failed');
  const passed = finished.filter((r) => r.status === 'passed').length;

  const lastRunByWorkflow = {};
  for (const r of runs) {
    if (r.workflowId && !lastRunByWorkflow[r.workflowId]) {
      lastRunByWorkflow[r.workflowId] = { runId: r.id, status: r.status, finishedAt: r.finishedAt };
    }
  }

  res.json({
    totalWorkflows: workflowStore.countByOwner(req.user.id),
    totalRuns: runs.length,
    passRate: finished.length ? Math.round((passed / finished.length) * 1000) / 10 : null,
    lastRunByWorkflow,
  });
};

// GET /api/runs/:id
export const getRun = (req, res) => {
  res.json({ run: toPublicRun(loadRunAccessible(req)) });
};

// GET /api/runs/:id/screenshots/:shotId
// Screenshots are never public static files. The user must be allowed to see the run,
// and the id must belong to that run.
export const getScreenshot = (req, res, next) => {
  const run = loadRunAccessible(req);
  const { shotId } = req.validated.params;

  const belongsToRun =
    run.steps.some((s) => s.screenshotId === shotId) || run.quick?.screenshotId === shotId;
  if (!belongsToRun) throw new AppError(404, 'Screenshot not found');

  // "root" confines the lookup to the screenshots folder. Ids are validated UUIDs.
  res.sendFile(`${run.id}/${shotId}.png`, { root: SCREENSHOT_ROOT, dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) next(new AppError(404, 'Screenshot not found'));
  });
};