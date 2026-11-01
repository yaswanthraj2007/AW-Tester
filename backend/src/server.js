import fs from 'fs/promises';
import app from './app.js';
import { config } from './config/index.js';
import { SCREENSHOT_ROOT } from './config/paths.js';
import { seedAdmin } from './services/seedAdmin.js';
import { refreshTokenStore } from './store/refreshTokenStore.js';

// TODO(MySQL): remove this wipe once runs are persisted
await fs.rm(SCREENSHOT_ROOT, { recursive: true, force: true });
await fs.mkdir(SCREENSHOT_ROOT, { recursive: true });

await seedAdmin();

setInterval(() => refreshTokenStore.purgeExpired(), 60 * 60 * 1000).unref();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
});

const server = app.listen(config.port, () => {
  console.log(`FlowTest API running on port ${config.port} (${config.nodeEnv})`);
});

const shutdown = () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);