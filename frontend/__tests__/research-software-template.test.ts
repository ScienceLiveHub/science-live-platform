/**
 * Tests for the Research Software template (RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk).
 *
 * Exercises `generateNanopublication` with the payload shape produced by
 * `ResearchSoftware.tsx`'s onSubmit — in particular the array→statement-id
 * mapping for the repeatable `sub:st041` (datasets) and `sub:st05`
 * (research outputs) statements.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

const pubdata = {
  name: "Test User",
  orcid: "https://orcid.org/0000-0000-0000-0000",
  baseUri: "https://w3id.org/np/",
  timestamp: new Date("2026-04-23T12:00:00.000Z"),
};

const SOFTWARE_URI = "https://doi.org/10.5281/zenodo.1234567";
const REPO_URI = "https://github.com/example/research-software";
const PROJECT_URI =
  "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123";

describe("Research Software template", () => {
  let template: NanopubTemplate;

  beforeAll(async () => {
    const trig = await readFile(
      join(
        __dirname,
        "fixtures",
        "RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk.trig",
      ),
      "utf-8",
    );
    template = await NanopubTemplate.loadString(trig);
  });

  it("loads without errors", () => {
    expect(template).toBeDefined();
    expect(template.fields.length).toBeGreaterThan(0);
    expect(template.statements.size).toBeGreaterThan(0);
  });

  it("extracts all expected placeholders", () => {
    const fieldIds = template.fields.map((f) => f.id);
    for (const p of [
      "software",
      "title",
      "repository",
      "project",
      "dataset",
      "researchoutput",
      "license",
    ]) {
      expect(fieldIds.some((id) => id.endsWith(p))).toBe(true);
    }
  });

  it("generates a minimal nanopub (required fields only)", async () => {
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).toContain(SOFTWARE_URI);
    expect(signedRdf).toContain(REPO_URI);
    expect(signedRdf).toContain(PROJECT_URI);
    expect(signedRdf).toContain('"Test Research Software"');
    // Optional statements with no value should not appear
    expect(signedRdf).not.toContain("/license>");
    expect(signedRdf).not.toMatch(/skos:related|skos\/core#related/);
    expect(signedRdf).not.toMatch(/cito:supports|cito\/supports/);
  });

  it("includes a single dataset when one is provided via st041", async () => {
    const datasetUri = "https://doi.org/10.5281/zenodo.9999999";
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
        st041: [{ dataset: datasetUri }],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).toContain(datasetUri);
    expect(signedRdf).toMatch(/skos:related|skos\/core#related/);
  });

  it("includes multiple datasets when an array is provided via st041", async () => {
    const ds1 = "https://doi.org/10.5281/zenodo.1111111";
    const ds2 = "https://doi.org/10.5281/zenodo.2222222";
    const ds3 = "https://example.org/data/three";
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
        st041: [
          { dataset: ds1 },
          { dataset: ds2 },
          { dataset: ds3 },
        ],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).toContain(ds1);
    expect(signedRdf).toContain(ds2);
    expect(signedRdf).toContain(ds3);
    // Should not leak the template placeholder URI
    expect(signedRdf).not.toContain(
      "RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk/dataset",
    );
  });

  it("includes related publications when provided via st05", async () => {
    const pub1 = "https://doi.org/10.1000/paper.one";
    const pub2 = "https://doi.org/10.1000/paper.two";
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
        st05: [{ researchoutput: pub1 }, { researchoutput: pub2 }],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).toContain(pub1);
    expect(signedRdf).toContain(pub2);
    expect(signedRdf).toMatch(/cito:supports|cito\/supports/);
    expect(signedRdf).not.toContain(
      "RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk/researchoutput",
    );
  });

  it("handles datasets and research outputs together", async () => {
    const datasetUri = "https://doi.org/10.5281/zenodo.1111111";
    const pubUri = "https://doi.org/10.1000/paper.one";
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
        license: "https://spdx.org/licenses/MIT.html",
        st041: [{ dataset: datasetUri }],
        st05: [{ researchoutput: pubUri }],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).toContain(datasetUri);
    expect(signedRdf).toContain(pubUri);
    expect(signedRdf).toContain("https://spdx.org/licenses/MIT.html");
    // Assertion-side license triple (serializer may use dc: or dct: prefix
    // for http://purl.org/dc/terms/license — tolerate both, plus the raw URI)
    expect(signedRdf).toMatch(/dct?:license|terms\/license/);
  });

  it("demonstrates the OLD broken behaviour: unmapped `datasets` array is silently dropped", async () => {
    // This is what the buggy form used to send: the raw form field name,
    // not the statement id. The generator can't match it, so the datasets
    // disappear from the RDF.
    const datasetUri = "https://doi.org/10.5281/zenodo.9999999";
    const { signedRdf } = await template.generateNanopublication(
      {
        software: SOFTWARE_URI,
        title: "Test Research Software",
        repository: REPO_URI,
        project: PROJECT_URI,
        // Wrong key: should be `st041`, not `datasets`
        datasets: [datasetUri],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    // Data silently lost — the URI is nowhere in the output
    expect(signedRdf).not.toContain(datasetUri);
  });
});
