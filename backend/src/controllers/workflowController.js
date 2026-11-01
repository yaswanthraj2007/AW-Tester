import { workflowStore } from '../store/workflowStore.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  MAX_WORKFLOWS_PER_USER,
  buildWorkflowData,
  assertWorkflowUrlsAllowed,
  toPublicWorkflow,
} from '../services/workflowService.js';

// Loads a workflow the current user is allowed to access, or throws 404.
// Admins may read any workflow, but only owners may change one.
const loadAccessible = (req, { allowAdminRead = false } = {}) => {
  const workflow = workflowStore.findById(req.validated.params.id);
  const isOwner = workflow && workflow.ownerId === req.user.id;
  const isAdminRead = allowAdminRead && req.user.role === 'admin';

  if (!workflow || !(isOwner || isAdminRead)) {
    throw new AppError(404, 'Workflow not found');
  }
  return workflow;
};

// GET /api/workflows  (the current user's own workflows)
export const listWorkflows = (req, res) => {
  const workflows = workflowStore.listByOwner(req.user.id).map(toPublicWorkflow);
  res.json({ workflows });
};

// POST /api/workflows
// POST /api/workflows
export const createWorkflow = asyncHandler(async (req, res) => {
  if (workflowStore.countByOwner(req.user.id) >= MAX_WORKFLOWS_PER_USER) {
    throw new AppError(409, `You can have at most ${MAX_WORKFLOWS_PER_USER} workflows. Delete one to add another.`);
  }
  const data = buildWorkflowData(req.validated.body);
  await assertWorkflowUrlsAllowed(data);

  const workflow = workflowStore.create(req.user.id, data);
  res.status(201).json({ workflow: toPublicWorkflow(workflow) });
});


// GET /api/workflows/:id
export const getWorkflow = (req, res) => {
  const workflow = loadAccessible(req, { allowAdminRead: true });
  res.json({ workflow: toPublicWorkflow(workflow) });
};

// PUT /api/workflows/:id  (full replace)
export const updateWorkflow = asyncHandler(async (req, res) => {
  const workflow = loadAccessible(req);
  const data = buildWorkflowData(req.validated.body);
  await assertWorkflowUrlsAllowed(data);

  const updated = workflowStore.update(workflow.id, data);
  if (!updated) throw new AppError(404, 'Workflow not found'); // deleted while we were checking URLs
  res.json({ workflow: toPublicWorkflow(updated) });
});

// DELETE /api/workflows/:id
export const deleteWorkflow = (req, res) => {
  const workflow = loadAccessible(req);
  workflowStore.delete(workflow.id);
  res.status(204).end();
};

// Exported so the run controller (Step 5) uses the exact same access rules
export { loadAccessible };