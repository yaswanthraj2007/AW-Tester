import fs from 'fs/promises';
import path from 'path';
import { SCREENSHOT_ROOT } from '../config/paths.js';
import { userStore } from '../store/userStore.js';
import { workflowStore } from '../store/workflowStore.js';
import { runStore } from '../store/runStore.js';
import { refreshTokenStore } from '../store/refreshTokenStore.js';

export const hasActiveRuns = (userId) =>
  runStore.listByOwner(userId).some((r) => r.status === 'queued' || r.status === 'running');

// TODO(MySQL): do this in one transaction (or rely on ON DELETE CASCADE foreign keys).
export const deleteUserCascade = async (userId) => {
  const runIds = runStore.listByOwner(userId).map((r) => r.id);

  refreshTokenStore.revokeAllForUser(userId);
  workflowStore.deleteByOwner(userId);
  for (const id of runIds) runStore.delete(id);
  userStore.delete(userId);

  await Promise.all(
    runIds.map((id) => fs.rm(path.join(SCREENSHOT_ROOT, id), { recursive: true, force: true }))
  );
};