import { workflowStore } from '../store/workflowStore.js';
import { workflowSchema } from '../validators/workflowSchemas.js';
import { buildWorkflowData } from './workflowService.js';

const SAMPLES = [
  {
    name: 'Example.com smoke test',
    description: 'Loads example.com and checks the heading.',
    targetUrl: 'https://example.com',
    steps: [
      { action: 'goto', url: 'https://example.com' },
      { action: 'assertVisible', selector: 'h1' },
      { action: 'assertText', selector: 'h1', expected: 'Example Domain' },
      { action: 'assertUrl', expected: 'example.com' },
      { action: 'screenshot', name: 'home-page' },
    ],
  },
  {
    name: 'Login form test',
    description: 'Logs in on the-internet.herokuapp.com (a public practice site).',
    targetUrl: 'https://the-internet.herokuapp.com/login',
    steps: [
      { action: 'goto', url: 'https://the-internet.herokuapp.com/login' },
      { action: 'fill', selector: '#username', value: 'tomsmith' },
      { action: 'fill', selector: '#password', value: 'SuperSecretPassword!' },
      { action: 'click', selector: 'button[type="submit"]' },
      { action: 'assertText', selector: '#flash', expected: 'You logged into a secure area!' },
      { action: 'assertUrl', expected: '/secure' },
      { action: 'screenshot', name: 'after-login' },
    ],
  },
];

export const seedSampleWorkflows = (ownerId) => {
  for (const sample of SAMPLES) {
    // Parsing through the real schema guarantees samples follow the same rules as user input
    workflowStore.create(ownerId, buildWorkflowData(workflowSchema.parse(sample)));
  }
};