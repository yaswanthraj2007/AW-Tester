import { v4 as uuid } from 'uuid';

// TODO(MySQL): `workflows` table (id, owner_id FK, name, description, target_url,
// settings JSON, created_at, updated_at) and a `steps` table (id, workflow_id FK,
// position, action, params JSON). Every query that reads or changes one workflow
// must include "AND owner_id = ?" (or be an explicit admin read).
const workflows = new Map();

const UPDATABLE = new Set(['name', 'description', 'targetUrl', 'steps', 'settings']);

export const workflowStore = {
  create(ownerId, data) {
    const now = new Date().toISOString();
    const workflow = { id: uuid(), ownerId, ...data, createdAt: now, updatedAt: now };
    workflows.set(workflow.id, workflow);
    return workflow;
  },

  findById(id) {
    return workflows.get(id) || null;
  },

  listByOwner(ownerId) {
    return [...workflows.values()]
      .filter((w) => w.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  listAll() {
    return [...workflows.values()];
  },

  countByOwner(ownerId) {
    let count = 0;
    for (const w of workflows.values()) if (w.ownerId === ownerId) count++;
    return count;
  },

  update(id, patch) {
    const workflow = workflows.get(id);
    if (!workflow) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (UPDATABLE.has(key)) workflow[key] = value;
    }
    workflow.updatedAt = new Date().toISOString();
    return workflow;
  },

  delete(id) {
    return workflows.delete(id);
  },

  deleteByOwner(ownerId) {
    for (const [id, w] of workflows.entries()) {
      if (w.ownerId === ownerId) workflows.delete(id);
    }
  },
};