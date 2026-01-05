import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/utils";

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
    name: "Test User1",
    orcid: "https://orcid.org/0000-9999-1234-9999",
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

  it("should load template from string", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    // Verify template loaded correctly
    expect(template).toBeDefined();
    expect(template).toBeInstanceOf(NanopubTemplate);
    expect(template.fields).toBeDefined();
    expect(template.statements).toBeDefined();
    expect(template.statements.size).toBeGreaterThan(0);
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

  it("should apply the template and match expected output exactly", async () => {
    const template = await NanopubTemplate.loadString(templateRdf);

    const { signedRdf: result } = await template.applyTemplate(
      testValues,
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(expectedOutput);
  });
});
