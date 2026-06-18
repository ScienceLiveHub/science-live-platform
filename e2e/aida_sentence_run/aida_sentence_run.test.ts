import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createArtifacts, getBaseUrl, launchBrowser, testDir } from "../lib/helpers";

// Example content used to fill the AIDA Sentence form.
const AIDA_SENTENCE = "The protein p53 inhibits tumor growth in human cells.";
const PROJECT_URI = "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE";

/**
 * Create an AIDA Sentence Nanopublication on Science Live Platform.
 *
 * Navigates to the platform, creates an AIDA Sentence nanopublication with
 * example content, generates it (without publishing), and verifies the preview
 * contains Template View, RDF View, and TriG View tabs with content.
 */
describe("AIDA Sentence nanopublication creation", () => {
  const baseUrl = getBaseUrl();
  const artifacts = createArtifacts("aida_sentence_run", testDir(import.meta.url));

  let browser: Browser | undefined;
  let page!: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });
  });

  afterAll(async () => {
    await browser?.close();
  });

  test("creates an AIDA Sentence nanopublication and verifies the preview tabs", async () => {
    // CP1 - Navigate to platform
    artifacts.log(`CP1: Navigating to ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "01_homepage.png");

    // CP2 - Navigate to the Create page
    artifacts.log("CP2: Clicking Create nav button to go to Create page");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "02_create_page.png");

    // CP3 - Select the AIDA Sentence template
    artifacts.log("CP3: Selecting AIDA Sentence template");
    await page.getByRole("button", { name: "AIDA Sentence Make structured" }).first().click();
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "03_template_selected.png");

    // CP4 - Fill in example content
    artifacts.log(`CP4: Filling AIDA sentence: '${AIDA_SENTENCE}'`);
    await page.getByPlaceholder("Enter sentence.").fill(AIDA_SENTENCE);
    artifacts.log(`CP4: Filling project URI: '${PROJECT_URI}'`);
    await page
      .getByPlaceholder("URI of nanopublication for related research project")
      .fill(PROJECT_URI);
    await page.waitForTimeout(2000);
    await artifacts.screenshot(page, "04_form_filled.png");

    // CP5 - Generate the nanopublication (not publish)
    artifacts.log("CP5: Clicking Generate Nanopublication button (not Publish)");
    await page.getByRole("button", { name: "Generate Nanopublication" }).click();
    await page.waitForTimeout(5000);
    await artifacts.screenshot(page, "05_generated.png");

    // CP6 - Verify the preview section appears below the form
    artifacts.log("CP6: Verifying preview section appears below the form");
    await page.getByRole("heading", { name: "PREVIEW:" }).waitFor({ timeout: 10_000 });
    await artifacts.screenshot(page, "06_preview_visible.png");

    // CP7 - Verify the Template View tab exists and shows content
    artifacts.log("CP7: Verifying Template View tab exists and shows content");
    await page.getByRole("tab", { name: "Template View" }).click();
    await page.waitForTimeout(500);
    const templateSnapshot = await page.ariaSnapshot();
    await artifacts.screenshot(page, "07_template_view.png");
    const templateHasContent =
      templateSnapshot.includes('tabpanel "Template View"') &&
      templateSnapshot.includes("AIDA Sentence");
    expect.soft(templateHasContent, "CP7 - Template View has content").toBe(true);

    // CP8 - Verify the RDF View tab exists and shows content
    artifacts.log("CP8: Verifying RDF View tab exists and shows content");
    await page.getByRole("tab", { name: "RDF View" }).click();
    await page.waitForTimeout(500);
    const rdfSnapshot = await page.ariaSnapshot();
    await artifacts.screenshot(page, "08_rdf_view.png");
    const rdfHasContent =
      rdfSnapshot.includes('tabpanel "RDF View"') &&
      rdfSnapshot.includes("Assertion") &&
      rdfSnapshot.includes("AIDA-Sentence");
    expect.soft(rdfHasContent, "CP8 - RDF View has content").toBe(true);

    // CP9 - Verify the TriG View tab exists and shows content
    artifacts.log("CP9: Verifying TriG View tab exists and shows content");
    await page.getByRole("tab", { name: "TriG View" }).click();
    await page.waitForTimeout(500);
    const trigSnapshot = await page.ariaSnapshot();
    await artifacts.screenshot(page, "09_trig_view.png");
    const trigHasContent =
      trigSnapshot.includes('tabpanel "TriG View"') &&
      trigSnapshot.includes("@prefix") &&
      trigSnapshot.includes("sub:assertion");
    expect.soft(trigHasContent, "CP9 - TriG View has content").toBe(true);
  });
});
