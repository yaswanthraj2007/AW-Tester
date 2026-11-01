import { AppError } from '../middleware/errorHandler.js';

const MAX_CONCURRENT = 3;
const MAX_QUEUED = 20;
const MAX_ACTIVE_PER_USER = 2;

const pending = [];
const activePerUser = new Map();
let running = 0;

const pump = () => {
  while (running < MAX_CONCURRENT && pending.length > 0) {
    const { userId, task } = pending.shift();
    running++;

    Promise.resolve()
      .then(task)
      .catch((err) => console.error('Run task crashed:', err.message))
      .finally(() => {
        running--;
        const left = (activePerUser.get(userId) ?? 1) - 1;
        if (left <= 0) activePerUser.delete(userId);
        else activePerUser.set(userId, left);
        pump();
      });
  }
};

// Throws (429/503) when the limits are hit. Otherwise queues the task.
export const enqueue = (userId, task) => {
  if ((activePerUser.get(userId) ?? 0) >= MAX_ACTIVE_PER_USER) {
    throw new AppError(429, `You already have ${MAX_ACTIVE_PER_USER} runs in progress. Wait for one to finish.`);
  }
  if (pending.length >= MAX_QUEUED) {
    throw new AppError(503, 'The test runner is busy. Please try again in a minute.');
  }
  activePerUser.set(userId, (activePerUser.get(userId) ?? 0) + 1);
  pending.push({ userId, task });
  pump();
};