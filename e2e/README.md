# E2E tests

End-to-end tests that drive a real browser ([Playwright](https://playwright.dev)) through the Science Live Platform web app.  These can mainly be generated and maintained by any competent coding agent with browser-use capability.

Each test lives in its own folder and follows the same shape:

```
e2e/
  vitest.config.ts          # Vitest config scoped to e2e/ (see below)
  tsconfig.json             # Editor / type-check support for the e2e tests
  lib/
    helpers.ts              # Shared helpers: BASE_URL, screenshots, logging, browser launch
  geographic_example/
    geographic_example.test.ts
  aida_sentence_run/
    aida_sentence_run.test.ts
  browse_filter_pagination/
    browse_filter_pagination.test.ts

  ... etc
```

Per-test artifacts (`screenshots/` and `*_log.txt`) are written next to each test
and are gitignored (see the root `.gitignore`).

## Prerequisites

To ensure Playwright is properly installed, after `npm install` at the repo
root, install the browser binaries once (not needed on machines where they are
already present, or if using the devcontainer which pre-installs it):

```sh
npx playwright install
```

## Run the tests

From the repo root, to run every e2e test:
```sh
npm run test:e2e
```

Filter and run a specific test (e.g. the geographic_example test):
```sh
npm run test:e2e -- geographic          
```

Interactive watch mode (re-runs on file changes):
```sh
npm run test:e2e:watch
```

These E2E tests are intentionally **not** part of `npm test` (which only runs the
frontend/api unit tests via workspaces) - they hit a live server and are slow, so
they are just run manually for now.

### Configuring the target instance (BASE_URL)

By default the tests run against the production deployment: https://platform.sciencelive4all.org

Override this with the `E2E_BASE_URL` environment variable to target a different
instance (e.g. a local dev server, a PR preview, or a staging deploy):

```sh
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

The active base URL is recorded at the top of each test's `*_log.txt`.

### Watching the browser / choosing the browser engine

Tests run headless by default. Set `E2E_HEADED=1` to launch a visible browser
window - useful when debugging a flaky flow manually:

```sh
E2E_HEADED=1 npm run test:e2e -- geographic
```

The default browser engine is **firefox**. Set `E2E_BROWSER` to `chromium` or `webkit` to use a different engine:

```sh
E2E_BROWSER=chromium npm run test:e2e
```

## How the tests are structured

Each test is a single Vitest `test()` that walks a user flow as a sequence of
**critical points** (CP1, CP2, …). Verifiable checkpoints use `expect.soft(...)`
so the test runs the whole flow and reports _every_ failed checkpoint rather than
bailing on the first one.

Each step is also logged to the test's `*_log.txt` and a screenshot is captured
into `screenshots/`.

The browser is launched once per test file via the shared `lib/helpers.ts`.

## Generate a new test

To generate a new E2E test in natural language, ask your agent something like:

```
I want to generate a new E2E test for Science Live Platform. Follow the patterns
set by the existing tests under the e2e/ folder (TypeScript + Vitest + Playwright,
see e2e/README.md and e2e/lib/helpers.ts).

The new test should perform these steps:

Go to https://platform.sciencelive4all.org, go to the browse page, wait for the
search to load, then press the Next button to view the next page of search
results. The label at the bottom should read "Page 2" instead of "Page 1" - if it
does not, report that as an error.
```

This assumes:

- You want to test the prod deployment (`https://platform.sciencelive4all.org`) by
  default - changeable via `E2E_BASE_URL` (or the `getBaseUrl()` default in
  `lib/helpers.ts`).
- The described flow actually works to completion so the agent can navigate the
  site and generate a faithful script.

If the app changes and a test breaks, ask the agent to fix/modify the existing
test in a similar way, or regenerate it from scratch mentioning any new changes.

## TODO

- [x] Make it easy to configure which `BASE_URL` to run tests on (`E2E_BASE_URL`).
- [x] Add an npm script that runs these via a test runner (Vitest).
- [ ] Integrate with a CI/CD pipeline / GitHub workflow as part of PR checks.
- [ ] Optionally auto-start a local instance/container and run the E2E tests
      against it when `E2E_BASE_URL` is not set.
