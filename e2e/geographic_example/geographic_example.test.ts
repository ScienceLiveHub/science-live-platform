import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createArtifacts, getBaseUrl, launchBrowser, testDir } from "../lib/helpers";

/**
 * Geographic Example on Science Live Platform.
 *
 * Navigates to the browse page, clicks the Geographic tab, clicks the first
 * example ("Data about Crabs around Southern Europe"), and verifies that
 * 5 locations are found.
 */
describe("Geographic example", () => {
  const baseUrl = getBaseUrl();
  const artifacts = createArtifacts("geographic_example", testDir(import.meta.url));

  let browser: Browser | undefined;
  let page!: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page = await browser.newPage({ viewport: { width: 1280, height: 2500 } });
  });

  afterAll(async () => {
    await browser?.close();
  });

  test("navigates to the Geographic tab and finds 5 locations", async () => {
    // CP1 - Navigate to homepage
    artifacts.log(`CP1: Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "01_homepage.png");

    // CP2 - Navigate to Browse page and wait for results to load
    artifacts.log("CP2: Clicking Browse link to navigate to browse page");
    await page.getByRole("link", { name: "Browse" }).click();
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await page.waitForTimeout(5000);
    // Best-effort: wait for the "Loading" indicator to disappear.
    await page
      .locator("text=Loading")
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "02_browse_page.png");
    const browseReached =
      page.url().includes("/np/") || (await page.ariaSnapshot()).includes("Browse");
    expect.soft(browseReached, "CP2 - Browse page reached").toBe(true);

    // CP3 - Click the Geographic tab and verify it is selected
    artifacts.log("CP3: Clicking the Geographic tab");
    await page.getByRole("tab", { name: "Geographic" }).click();
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "03_geographic_tab.png");
    const tabSnapshot = await page.ariaSnapshot();
    expect.soft(
      tabSnapshot.includes('tab "Geographic" [selected]'),
      "CP3 - Geographic tab selected",
    ).toBe(true);

    // CP4 - Click the first example and verify the search box fills with "crab"
    artifacts.log("CP4: Clicking the first example: 'Data about Crabs around Southern Europe'");
    await page.getByRole("button", { name: "Data about Crabs around Southern Europe" }).click();
    await page.waitForTimeout(5000);
    await artifacts.screenshot(page, "04_example_clicked.png");
    const searchValue = await page
      .getByRole("textbox", { name: "Enter search query..." })
      .inputValue();
    expect.soft(
      searchValue.toLowerCase().includes("crab"),
      "CP4 - Search textbox filled with 'crab'",
    ).toBe(true);

    // CP5 - Verify that 5 locations are found
    artifacts.log("CP5: Verifying that 5 locations are found");
    await page.locator("text=locations found").waitFor({ timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "05_locations_found.png");
    const locationsSnapshot = await page.ariaSnapshot();
    const inSnapshot = locationsSnapshot.includes("5 locations found");
    const visible = (await page.locator("text=5 locations found").count()) > 0;
    expect.soft(inSnapshot || visible, "CP5 - 5 locations found").toBe(true);
  });
});
