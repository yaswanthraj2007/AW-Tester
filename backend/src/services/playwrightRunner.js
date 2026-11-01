import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { config } from '../config/index.js';
import { SCREENSHOT_ROOT } from '../config/paths.js';
import { runStore } from '../store/runStore.js';
import { createUrlGuard } from '../utils/ssrf.js';
import { pruneRuns } from './runService.js';

const BROWSERS = { chromium, firefox, webkit };
const MAX_RUN_MS = 3 * 60 * 1000;
const MAX_CONSOLE_ERRORS = 20;
const MAX_BLOCKED_HOSTS = 20;
const LIMIT_MESSAGE = 'The run exceeded the 3 minute limit and was stopped.';

// An error whose message is written by us and safe to show as-is
class StepError extends Error {}

const ANSI = /\u001b\[[0-9;]*m/g;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const firstLine = (msg) => String(msg ?? '').replace(ANSI, '').split('\n')[0].trim().slice(0, 300);

// Message for a failed step
const stepErrorMessage = (err) =>
  err instanceof StepError ? err.message : firstLine(err?.message) || 'The step failed.';

// Message for a run-level failure. Never leaks server paths.
const runErrorMessage = (err) => {
  if (err instanceof StepError) return err.message;
  if (/Executable doesn't exist|browserType\.launch/i.test(String(err?.message))) {
    return 'The selected browser is not installed on the server.';
  }
  return 'The test runner hit an unexpected error.';
};

const takeScreenshot = async (page, dir) => {
  await fs.mkdir(dir, { recursive: true });
  const id = uuid(); // unguessable, server-generated file name
  await page.screenshot({ path: path.join(dir, `${id}.png`), timeout: 15000 });
  return id;
};

// Retries a check until it passes or the timeout is reached
const pollUntil = async (check, timeout) => {
  const deadline = Date.now() + timeout;
  let last;
  for (;;) {
    try {
      const result = await check(Math.max(250, deadline - Date.now()));
      if (result.ok) return;
      last = result.message;
    } catch (err) {
      last = firstLine(err.message);
    }
    if (Date.now() >= deadline) throw new StepError(last || 'Assertion failed');
    await sleep(250);
  }
};

const executeStep = async ({ page, guard, step, settings, shotDir }) => {
  const timeout = settings.defaultTimeout;

  switch (step.action) {
    case 'goto': {
      const verdict = await guard.check(step.url);
      if (!verdict.ok) throw new StepError(verdict.reason);
      await page.goto(step.url, { waitUntil: 'load', timeout });
      return null;
    }
    case 'click':
      await page.click(step.selector, { timeout });
      return null;
    case 'fill':
      await page.fill(step.selector, step.value, { timeout });
      return null;
    case 'select':
      await page.selectOption(step.selector, step.option, { timeout });
      return null;
    case 'press':
      await page.press(step.selector, step.key, { timeout });
      return null;
    case 'waitForSelector':
      await page.waitForSelector(step.selector, { timeout: step.timeout ?? timeout });
      return null;
    case 'assertVisible':
      await page.waitForSelector(step.selector, { state: 'visible', timeout });
      return null;
    case 'assertText':
      await pollUntil(async (t) => {
        const actual = await page.innerText(step.selector, { timeout: t });
        return {
          ok: actual.includes(step.expected),
          message: `Expected ${step.selector} to contain "${step.expected}" but it contained "${actual.trim().slice(0, 120)}"`,
        };
      }, timeout);
      return null;
    case 'assertUrl':
      await pollUntil(async () => ({
        ok: page.url().includes(step.expected),
        message: `Expected the URL to contain "${step.expected}" but it is "${page.url().slice(0, 200)}"`,
      }), timeout);
      return null;
    case 'screenshot':
      return { screenshotId: await takeScreenshot(page, shotDir) };
    default:
      throw new StepError('Unsupported step type'); // unreachable: the schema is an allow-list
  }
};

// Opens an isolated browser session, runs `work`, and always cleans up
const runInSession = async (run, work) => {
  const { settings } = run;
  const launcher = BROWSERS[settings.browser];
  if (!launcher) throw new StepError('Unsupported browser');

  const guard = createUrlGuard();
  const blocked = new Set();
  const consoleErrors = [];
  let timedOut = false;
  let browser;

  const killer = setTimeout(() => {
    timedOut = true;
    runStore.update(run.id, { error: LIMIT_MESSAGE });
    browser?.close().catch(() => {});
  }, MAX_RUN_MS);

  try {
    browser = await launcher.launch({ headless: config.isProd ? true : settings.headless });

    const context = await browser.newContext({
      viewport: settings.viewport,
      acceptDownloads: false,
      serviceWorkers: 'block', // service workers could bypass request interception
    });
    context.setDefaultTimeout(settings.defaultTimeout);
    context.setDefaultNavigationTimeout(settings.defaultTimeout);

    // SSRF guard on EVERY request: navigations, redirects, scripts, images, XHR...
    await context.route('**/*', async (route) => {
      try {
        const verdict = await guard.check(route.request().url());
        if (!verdict.ok) {
          if (verdict.code === 'PRIVATE' && blocked.size < MAX_BLOCKED_HOSTS) {
            blocked.add(verdict.host ?? 'unknown');
          }
          await route.abort(verdict.code === 'DNS' ? 'namenotresolved' : 'blockedbyclient');
          return;
        }
        await route.continue();
      } catch {
        await route.abort().catch(() => {});
      }
    });

    // The target site cannot spawn a pile of tabs
    context.on('page', (p) => {
      if (context.pages().length > 5) p.close().catch(() => {});
    });

    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error' && consoleErrors.length < MAX_CONSOLE_ERRORS) {
        consoleErrors.push(msg.text().slice(0, 300));
      }
    });
    page.on('pageerror', (err) => {
      if (consoleErrors.length < MAX_CONSOLE_ERRORS) {
        consoleErrors.push(`Uncaught: ${String(err.message).slice(0, 300)}`);
      }
    });

    await work({
      page,
      guard,
      shotDir: path.join(SCREENSHOT_ROOT, run.id),
      isTimedOut: () => timedOut,
    });
  } finally {
    clearTimeout(killer);
    runStore.update(run.id, { consoleErrors, blockedHosts: [...blocked] });
    await browser?.close().catch(() => {});
  }
};

const runWorkflow = async (run, startedMs) => {
  const { plan, settings } = run;
  let stopped = false;

  await runInSession(run, async ({ page, guard, shotDir, isTimedOut }) => {
    for (let i = 0; i < plan.length && !stopped; i++) {
      if (isTimedOut() || Date.now() - startedMs > MAX_RUN_MS) {
        runStore.update(run.id, { error: LIMIT_MESSAGE });
        break; // remaining steps are marked skipped in settleSteps
      }

      const t0 = Date.now();
      runStore.updateStep(run.id, i, { status: 'running' });

      try {
        const result = await executeStep({ page, guard, step: plan[i], settings, shotDir });
        runStore.updateStep(run.id, i, {
          status: 'passed',
          durationMs: Date.now() - t0,
          screenshotId: result?.screenshotId ?? null,
        });
      } catch (err) {
        const screenshotId = await takeScreenshot(page, shotDir).catch(() => null);
        runStore.updateStep(run.id, i, {
          status: 'failed',
          durationMs: Date.now() - t0,
          error: stepErrorMessage(err),
          screenshotId,
        });
        if (!settings.continueOnFailure) stopped = true;
      }
    }
  });
};

const runQuick = async (run) => {
  await runInSession(run, async ({ page, guard, shotDir }) => {
    const verdict = await guard.check(run.targetUrl);
    if (!verdict.ok) throw new StepError(verdict.reason);

    const t0 = Date.now();
    const response = await page.goto(run.targetUrl, {
      waitUntil: 'load',
      timeout: run.settings.defaultTimeout,
    });
    const loadTimeMs = Date.now() - t0;
    const httpStatus = response ? response.status() : null;

    const title = (await page.title()).slice(0, 300);
    const screenshotId = await takeScreenshot(page, shotDir).catch(() => null);

    runStore.update(run.id, {
      quick: { title, httpStatus, loadTimeMs, finalUrl: page.url().slice(0, 2048), screenshotId },
    });
    if (httpStatus && httpStatus >= 400) {
      runStore.update(run.id, { error: `The page responded with HTTP ${httpStatus}` });
    }
  });
};

// Anything still pending or running when the run ends is closed out
const settleSteps = (runId) => {
  const run = runStore.findById(runId);
  if (!run) return;
  run.steps.forEach((s, i) => {
    if (s.status === 'running') {
      runStore.updateStep(runId, i, { status: 'failed', error: s.error ?? 'The run was interrupted.' });
    } else if (s.status === 'pending') {
      runStore.updateStep(runId, i, { status: 'skipped' });
    }
  });
};

// Called by the queue. Never throws.
export const executeRun = async (runId) => {
  const run = runStore.findById(runId);
  if (!run) return;

  const startedMs = Date.now();
  runStore.update(runId, { status: 'running', startedAt: new Date(startedMs).toISOString() });

  try {
    if (run.type === 'quick') await runQuick(run);
    else await runWorkflow(run, startedMs);
  } catch (err) {
    console.error(`[run ${runId}] ${err.message}`); // full detail stays on the server
    runStore.update(runId, { error: runErrorMessage(err) });
  } finally {
    settleSteps(runId);
    const final = runStore.findById(runId);
    if (final) {
      const failed = Boolean(final.error) || final.steps.some((s) => s.status === 'failed');
      runStore.update(runId, {
        status: failed ? 'failed' : 'passed',
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedMs,
      });
      await pruneRuns(final.ownerId).catch(() => {});
    }
  }
};