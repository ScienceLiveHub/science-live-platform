import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit, type Browser, type Page } from "playwright";

/** Default deployment under test. Override with the E2E_BASE_URL env var. */
export const DEFAULT_BASE_URL = "https://platform.sciencelive4all.org";

/** Base URL under test. Set E2E_BASE_URL to target a different instance. */
export function getBaseUrl(): string {
  return process.env.E2E_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

/** Directory of the calling test file, so each test writes artifacts next to itself. */
export function testDir(metaUrl: string): string {
  return dirname(fileURLToPath(metaUrl));
}

export interface Artifacts {
  /** Save a screenshot into the test's screenshots/ folder (gitignored). */
  screenshot: (page: Page, filename: string) => Promise<void>;
  /** Append a step/action line to the test log and mirror it to stdout. */
  log: (message: string) => void;
}

/**
 * Set up per-test artifacts: a screenshots/ directory and a *_log.txt file
 * (both gitignored — see the root .gitignore). Returns helpers bound to that
 * test's directory.
 */
export function createArtifacts(testName: string, dir: string): Artifacts {
  const screenshotsDir = join(dir, "screenshots");
  mkdirSync(screenshotsDir, { recursive: true });

  const logFile = join(dir, `${testName}_log.txt`);
  writeFileSync(
    logFile,
    `=== ${testName} E2E Test ===\nStarted: ${new Date().toISOString()}\nBase URL: ${getBaseUrl()}\n\n`,
  );

  return {
    async screenshot(page: Page, filename: string) {
      await page.screenshot({ path: join(screenshotsDir, filename) });
    },
    log(message: string) {
      const line = `[${new Date().toISOString()}] ${message}`;
      appendFileSync(logFile, line + "\n");
      console.log(message);
    },
  };
}

/**
 * Launch the browser used for E2E tests. Defaults to headless firefox.
 * Set E2E_HEADED=1 to watch the browser run,
 * which is handy when debugging a flaky flow manually. Set E2E_BROWSER to
 * "chromium" or "webkit" to use a different engine.
 */
export async function launchBrowser(): Promise<Browser> {
  const headed = process.env.E2E_HEADED === "1" || process.env.E2E_HEADED === "true";
  const name = (process.env.E2E_BROWSER ?? "firefox").toLowerCase();
  const engine = name === "chromium" ? chromium : name === "webkit" ? webkit : firefox;
  return engine.launch({ headless: !headed });
}
