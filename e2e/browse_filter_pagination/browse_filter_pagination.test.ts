import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createArtifacts, getBaseUrl, launchBrowser, testDir } from "../lib/helpers";

/**
 * Browse, Filter and Pagination on Science Live Platform.
 *
 * Navigates to the browse page, tests filtering by template type, sorting,
 * pagination, and clearing filters, verifying each operation works correctly.
 */
describe("Browse, filter and pagination", () => {
  const baseUrl = getBaseUrl();
  const artifacts = createArtifacts("browse_filter_pagination", testDir(import.meta.url));

  let browser: Browser | undefined;
  let page!: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page = await browser.newPage({ viewport: { width: 1280, height: 2500 } });
  });

  afterAll(async () => {
    await browser?.close();
  });

  test("filters, sorts and paginates the browse page", async () => {
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
    await artifacts.screenshot(page, "02_browse_page.png");
    expect.soft(page.url().includes("/np/"), "CP2 - Browse page reached").toBe(true);

    // CP3 - Wait for nanopublications to load
    artifacts.log("CP3: Waiting for nanopublications to load");
    await page
      .locator("text=Loading")
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "03_results_loaded.png");

    // CP4 - Filter by Core
    artifacts.log("CP4: Clicking 'Core' filter checkbox");
    await page.locator("label", { hasText: "Core" }).first().click();
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "04_core_filter.png");
    const coreClearVisible =
      (await page.getByRole("button", { name: "Clear filters" }).count()) > 0;
    const coreHeadingVisible =
      (await page.getByRole("heading", { name: "Nanopublications with selected Template(s)" }).count()) >
      0;
    const coreAria = await page.ariaSnapshot();
    const coreHasResults = coreAria.includes("AIDA") || coreAria.includes("Core");
    expect.soft(coreClearVisible && coreHeadingVisible && coreHasResults, "CP4 - Core filter applied").toBe(
      true,
    );

    // CP5 - Sort by Most Referenced
    artifacts.log("CP5: Clicking sort dropdown and selecting 'Most Referenced'");
    await page.getByRole("combobox").click();
    await page.waitForTimeout(500);
    await artifacts.screenshot(page, "05_sort_dropdown.png");
    await page.getByRole("option", { name: "Most Referenced" }).click();
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "06_most_referenced_sorted.png");
    const mostRefSortValue = await page.getByRole("combobox").innerText();
    expect.soft(mostRefSortValue.includes("Most Referenced"), "CP5 - Sorted by Most Referenced").toBe(
      true,
    );

    // CP6 - Click Next to go to Page 2
    artifacts.log("CP6: Clicking 'Next' button to go to Page 2");
    const nextBtn = page.getByRole("button", { name: "Next" });
    let page2Displayed = false;
    if ((await nextBtn.count()) > 0 && !(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
      await artifacts.screenshot(page, "07_page_2.png");
      page2Displayed = (await page.locator("text=Page 2").count()) > 0;
    } else {
      artifacts.log("CP6: Next button not available or disabled - skipping");
    }
    expect.soft(page2Displayed, "CP6 - Page 2 displayed").toBe(true);

    // CP7 - Change sort back to Newest First and verify it returns to Page 1
    artifacts.log("CP7: Changing sort back to 'Newest First'");
    await page.getByRole("combobox").click();
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: "Newest first" }).click();
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "08_newest_first.png");
    const newestSortValue = await page.getByRole("combobox").innerText();
    const newestSorted = newestSortValue.includes("Newest");
    const backToPage1 = (await page.locator("text=Page 1").count()) > 0;
    expect.soft(newestSorted && backToPage1, "CP7 - Newest First sort and Page 1 restored").toBe(true);

    // CP8 - Clear filters
    artifacts.log("CP8: Clicking 'Clear filters' button");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForTimeout(5000);
    await artifacts.screenshot(page, "09_filters_cleared.png");
    let heading = page.getByRole("heading", { name: "Latest Nanopublications" });
    if ((await heading.count()) === 0) {
      await page.waitForTimeout(2000);
      heading = page.getByRole("heading", { name: "Latest Nanopublications" });
    }
    const filtersCleared = (await heading.count()) > 0;
    expect.soft(filtersCleared, "CP8 - Filters cleared").toBe(true);

    // CP9 - Filter by PRISMA Database Search
    artifacts.log("CP9: Clicking 'PRISMA Database Search' filter");
    await page.locator("label", { hasText: "PRISMA Database Search" }).first().click();
    await page.waitForTimeout(3000);
    await artifacts.screenshot(page, "10_prisma_filter.png");
    const prismaClearVisible =
      (await page.getByRole("button", { name: "Clear filters" }).count()) > 0;
    const prismaHeadingVisible =
      (await page.getByRole("heading", { name: "Nanopublications with selected Template(s)" }).count()) >
      0;
    expect.soft(
      prismaClearVisible && prismaHeadingVisible,
      "CP9 - PRISMA Database Search filter applied",
    ).toBe(true);
  });
});
