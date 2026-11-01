import { userStore, toPublic } from '../store/userStore.js';
import { workflowStore } from '../store/workflowStore.js';
import { runStore } from '../store/runStore.js';
import { refreshTokenStore } from '../store/refreshTokenStore.js';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { toRunSummary } from '../services/runService.js';
import { hasActiveRuns, deleteUserCascade } from '../services/adminService.js';

// User as an admin sees it: public fields plus lock state and activity counts.
// Never includes passwordHash.
const toAdminUser = (user) => ({
  ...toPublic(user),
  isLocked: Boolean(user.lockUntil) && user.lockUntil > Date.now(),
  workflowCount: workflowStore.countByOwner(user.id),
  runCount: runStore.countByOwner(user.id),
});

const loadTarget = (req) => {
  const target = userStore.findById(req.validated.params.id);
  if (!target) throw new AppError(404, 'User not found');
  return target;
};

const isLastActiveAdmin = (user) =>
  user.role === 'admin' && user.isActive && userStore.countActiveAdmins() <= 1;

// GET /api/admin/stats
export const getAdminStats = (req, res) => {
  const users = userStore.list();
  const runs = runStore.listAll();

  const byStatus = { queued: 0, running: 0, passed: 0, failed: 0 };
  for (const r of runs) byStatus[r.status]++;
  const finished = byStatus.passed + byStatus.failed;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  res.json({
    users: {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      disabled: users.filter((u) => !u.isActive).length,
      admins: users.filter((u) => u.role === 'admin').length,
    },
    workflows: { total: workflowStore.listAll().length },
    runs: {
      total: runs.length,
      byStatus,
      last24h: runs.filter((r) => Date.parse(r.createdAt) >= dayAgo).length,
      passRate: finished ? Math.round((byStatus.passed / finished) * 1000) / 10 : null,
    },
    generatedAt: new Date().toISOString(),
  });
};

// GET /api/admin/users
export const listUsers = (req, res) => {
  const { search, role, status, page = 1, limit = 20 } = req.validated.query;

  let users = userStore.list().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u) => u.email.includes(q)); // plain substring, no regex
  }
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.isActive === (status === 'active'));

  const total = users.length;
  const items = users.slice((page - 1) * limit, page * limit).map(toAdminUser);
  res.json({ users: items, total, page, limit });
};

// PATCH /api/admin/users/:id
export const updateUser = (req, res) => {
  const target = loadTarget(req);

  if (target.id === req.user.id) {
    throw new AppError(400, 'You cannot change your own role or status.');
  }

  const { role, isActive } = req.validated.body;

  const removesAdmin =
    (role !== undefined && role !== 'admin') || isActive === false;
  if (removesAdmin && isLastActiveAdmin(target)) {
    throw new AppError(409, 'The last active admin cannot be demoted or disabled.');
  }

  const patch = {};
  if (role !== undefined) patch.role = role;
  if (isActive !== undefined) {
    patch.isActive = isActive;
    if (isActive) {
      // Re-enabling also clears any login lockout
      patch.failedLoginAttempts = 0;
      patch.lockUntil = null;
    }
  }

  const updated = userStore.update(target.id, patch);

  // Disabled users lose their sessions right away
  if (isActive === false) refreshTokenStore.revokeAllForUser(target.id);

  audit(req, 'admin.user.update', {
    target: target.id,
    changes: { role, isActive },
  });

  res.json({ user: toAdminUser(updated) });
};

// DELETE /api/admin/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const target = loadTarget(req);

  if (target.id === req.user.id) {
    throw new AppError(400, 'You cannot delete your own account.');
  }
  if (isLastActiveAdmin(target)) {
    throw new AppError(409, 'The last active admin cannot be deleted.');
  }
  if (hasActiveRuns(target.id)) {
    throw new AppError(409, 'This user has runs in progress. Try again when they finish.');
  }

  await deleteUserCascade(target.id);
  audit(req, 'admin.user.delete', { target: target.id });
  res.status(204).end();
});

// GET /api/admin/runs  (all users' runs)
// Full run details and screenshots are available to admins through
// GET /api/runs/:id and GET /api/runs/:id/screenshots/:shotId.
export const listAllRuns = (req, res) => {
  const { status, type, ownerId, page = 1, limit = 20 } = req.validated.query;

  let runs = runStore.listAll(); // newest first
  if (status) runs = runs.filter((r) => r.status === status);
  if (type) runs = runs.filter((r) => r.type === type);
  if (ownerId) runs = runs.filter((r) => r.ownerId === ownerId);

  const total = runs.length;
  const items = runs.slice((page - 1) * limit, page * limit).map((r) => ({
    ...toRunSummary(r),
    ownerId: r.ownerId,
    ownerEmail: userStore.findById(r.ownerId)?.email ?? null,
  }));

  res.json({ runs: items, total, page, limit });
};