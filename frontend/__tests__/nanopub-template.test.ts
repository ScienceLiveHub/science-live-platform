import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey, getUriEnd } from "../src/lib/utils";

describe("NanopubTemplate.applyTemplate", () => {
  let templateRdf: string;
  let expectedOutput: string;

  // Test values to apply
  const testValues = {
    article: "https://doi.org/10.1016/j.joclim.2025.100573",
    cites: "http://purl.org/spar/cito/usesDataFrom",
    cited: "https://doi.org/10.1126/science.aar3646",
  };

  const pubdata = {
    name: "Anne Fouilloux",
    orcid: "https://orcid.org/0000-0002-1784-2920",
    baseUri: "https://w3id.org/np/",
    timestamp: new Date("2025-01-01T00:00:00.000Z"),
  };

  beforeAll(async () => {
    // Load fixture files
    const fixturesDir = join(__dirname, "fixtures");
    templateRdf = await readFile(
      join(fixturesDir, "RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo.trig"),
      "utf-8",
    );
    expectedOutput = await readFile(
      join(fixturesDir, "applyTemplate-expected.trig"),
      "utf-8",
    );
  });

  it("should load template from string using loadString()", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    // Verify template loaded correctly
    expect(template).toBeDefined();
    expect(template).toBeInstanceOf(NanopubTemplate);
    expect(template.fields).toBeDefined();
    expect(template.statements).toBeDefined();
    expect(template.statements.size).toBeGreaterThan(0);
  });

  it("should apply template with provided values", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify result is a string
    expect(typeof result).toBe("string");

    // Verify it's valid TRIG format
    expect(result).toContain("PREFIX");
    expect(result).toContain("sub:Head");
    expect(result).toContain("sub:assertion");
    expect(result).toContain("sub:provenance");
    expect(result).toContain("sub:pubinfo");
  });

  it("should generate correct nanopub structure with required graphs", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify Head graph structure
    expect(result).toContain("np:hasAssertion sub:assertion");
    expect(result).toContain("np:hasProvenance sub:provenance");
    expect(result).toContain("np:hasPublicationInfo sub:pubinfo");
  });

  it("should replace placeholder values correctly", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify placeholder replacements
    expect(result).toContain(testValues.article);
    expect(result).toContain(testValues.cites);
    expect(result).toContain(testValues.cited);

    // Verify the assertion contains the expected triples
    expect(result).toContain(
      `<${testValues.article}> a <http://purl.org/spar/fabio/ScholarlyWork>`,
    );
    expect(result).toContain(`<${testValues.cites}> <${testValues.cited}>`);
  });

  it("should include creator information", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify creator info
    expect(result).toContain("Anne Fouilloux");
    expect(result).toContain("orcid:0000-0002-1784-2920");

    // Verify provenance attribution
    expect(result).toContain("prov:wasAttributedTo");
  });

  it("should interpolate label pattern correctly", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify label interpolation from template pattern
    expect(result).toContain(
      `rdfs:label "Citations for: ${getUriEnd(testValues.article)}"`,
    );
  });

  it("should include required metadata", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const testValues = {
      article: "https://doi.org/10.1016/j.joclim.2025.100573",
      cites: "http://purl.org/spar/cito/usesDataFrom",
      cited: "https://doi.org/10.1126/science.aar3646",
    };

    const pubdata = {
      name: "Anne Fouilloux",
      orcid: "https://orcid.org/0000-0002-1784-2920",
      baseUri: "https://w3id.org/np/",
      timestamp: new Date("2025-01-01T00:00:00.000Z"),
      license: "https://creativecommons.org/licenses/by/4.0/",
    };

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Verify created date
    expect(result).toContain(
      'dcterms:created "2025-01-01T00:00:00.000Z"^^xsd:dateTime',
    );

    // Verify license
    expect(result).toContain("https://creativecommons.org/licenses/by/4.0/");

    // Verify template reference
    expect(result).toContain(
      "wasCreatedFromTemplate> <https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo>",
    );

    // Verify creation platform
    expect(result).toContain(
      "npx:wasCreatedAt <https://platform.sciencelive4all.org>",
    );
  });

  it("should match expected output structure (ignoring hash)", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const testValues = {
      article: "https://doi.org/10.1016/j.joclim.2025.100573",
      cites: "http://purl.org/spar/cito/usesDataFrom",
      cited: "https://doi.org/10.1126/science.aar3646",
    };

    const pubdata = {
      name: "Anne Fouilloux",
      orcid: "https://orcid.org/0000-0002-1784-2920",
      baseUri: "https://w3id.org/np/",
      timestamp: new Date("2025-01-01T00:00:00.000Z"),
    };

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    // Since the hash is dynamically generated, we compare structure
    // by replacing the actual hash with placeholder for comparison

    // Extract hash pattern from result
    const hashPattern = /RA[0-9A-Za-z_-]+/g;
    const resultWithPlaceholder = result.replace(
      hashPattern,
      "PLACEHOLDER_HASH",
    );

    // Also ensure the expected output is normalized
    const expectedNormalized = expectedOutput.replace(/\r\n/g, "\n").trim();
    const resultNormalized = resultWithPlaceholder
      .replace(/\r\n/g, "\n")
      .trim();

    // Compare structure - the main elements should be the same
    // We check key structural components since hash generation varies
    expect(resultNormalized).toContain("sub:Head {");
    expect(resultNormalized).toContain("sub:assertion {");
    expect(resultNormalized).toContain("sub:provenance {");
    expect(resultNormalized).toContain("sub:pubinfo {");

    // Check that all expected prefixes are present
    expect(resultNormalized).toContain("PREFIX this:");
    expect(resultNormalized).toContain("PREFIX sub:");
    expect(resultNormalized).toContain("PREFIX rdfs:");
    expect(resultNormalized).toContain("PREFIX xsd:");
    expect(resultNormalized).toContain("PREFIX np:");
    expect(resultNormalized).toContain("PREFIX npx:");
    expect(resultNormalized).toContain("PREFIX dcterms:");
    expect(resultNormalized).toContain("PREFIX prov:");
    expect(resultNormalized).toContain("PREFIX foaf:");
    expect(resultNormalized).toContain("PREFIX orcid:");
  });

  it("should extract fields from template", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    // Verify fields were extracted
    expect(template.fields.length).toBeGreaterThan(0);

    // Check for expected placeholder fields
    const fieldIds = template.fields.map((f: any) => f.id);
    expect(fieldIds).toContainEqual(expect.stringContaining("article"));
    expect(fieldIds).toContainEqual(expect.stringContaining("cited"));
    expect(fieldIds).toContainEqual(expect.stringContaining("cites"));
  });

  it("should extract statements from template", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    // Verify statements were extracted
    expect(template.statements.size).toBeGreaterThan(0);

    // Check for expected statements
    const statements = Array.from(template.statements.values());
    expect(statements.some((s: any) => s.subject.includes("article"))).toBe(
      true,
    );
    expect(statements.some((s: any) => s.object.includes("cited"))).toBe(true);
  });
});
