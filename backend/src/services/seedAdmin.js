import { config } from '../config/index.js';
import { userStore } from '../store/userStore.js';
import { hashPassword, passwordSchema } from '../utils/password.js';
import { seedSampleWorkflows } from './sampleWorkflows.js';

export const seedAdmin = async () => {
  // The admin password must meet the same policy as everyone else
  const check = passwordSchema.safeParse(config.adminPassword);
  if (!check.success) {
    console.error('ADMIN_PASSWORD does not meet the password policy:');
    console.error(check.error.issues.map((i) => `- ${i.message}`).join('\n'));
    process.exit(1);
  }

  if (userStore.findByEmail(config.adminEmail)) return;

  const passwordHash = await hashPassword(config.adminPassword);
  const admin = userStore.create({ email: config.adminEmail, passwordHash, role: 'admin' });
  seedSampleWorkflows(admin.id);
  console.log(`Admin account ready for ${config.adminEmail}`);
};
