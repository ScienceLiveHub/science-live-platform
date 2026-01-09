import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/utils";

describe("NanopubTemplate.applyTemplate", () => {
  const fixturesSets: { input: string; params: any[]; outputs: string[] }[] = [
    {
      input: "RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo.trig",
      params: [
        {
          article: "https://doi.org/10.1016/j.joclim.2025.100573",
          cites: "http://purl.org/spar/cito/usesDataFrom",
          cited: "https://doi.org/10.1126/science.aar3646",
        },
        {
          article: "https://doi.org/10.99999999",
          unrelated: "Some unrelated form data that should be EXCLUDED",
          st01: { article: "Another red-herring, which should be EXCLUDED" },
          st02: [
            {
              unrelated2: "https://exclude.this.data",
              article: "https://doi.org/10.99999999",
              cites: "http://purl.org/spar/cito/citesAsMetadataDocument",
              cited: "https://doi.org/10.11111111",
            },
            {
              article: "https://doi.org/10.33333333",
              cites: "http://purl.org/spar/cito/agreesWith",
              cited: "https://doi.org/10.44444444",
            },
            {
              article: "https://doi.org/10.99999999",
              cites: "http://purl.org/spar/cito/usesDataFrom",
              cited: "https://doi.org/10.44444444",
            },
          ],
        },
      ],
      outputs: [
        "RAX_4tWT-applyTemplate_expected_output_1.trig",
        "RAX_4tWT-applyTemplate_expected_output_2.trig",
      ],
    },
    {
      input: "RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI.trig",
      params: [
        {
          paper: "https://doi.org/10.1126/science.aar3646",
          relation: "http://purl.org/spar/cito/agreesWith",
          text: "This is a test comment (literal)",
        },
      ],
      outputs: ["RAVEpTdL-applyTemplate_expected_output.trig"],
    },
  ];

  const loadedFixtures: Record<string, string> = {};

  const pubdata = {
    name: "Test User1",
    orcid: "https://orcid.org/0000-9999-1234-9999",
    baseUri: "https://w3id.org/np/",
    timestamp: new Date("2025-01-01T00:00:00.000Z"),
  };

  beforeAll(async () => {
    // Load fixture files (input and outputs)
    const fixturesDir = join(__dirname, "fixtures");
    for (const [k, v] of Object.entries(fixturesSets)) {
      loadedFixtures[v.input] = await readFile(
        join(fixturesDir, v.input),
        "utf-8",
      );
      for (const o of v.outputs) {
        loadedFixtures[o] = await readFile(join(fixturesDir, o), "utf-8");
      }
    }
  });

  it("should load template from string", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    // Verify template loaded correctly
    expect(template).toBeDefined();
    expect(template).toBeInstanceOf(NanopubTemplate);
    expect(template.fields).toBeDefined();
    expect(template.statements).toBeDefined();
    expect(template.statements.size).toBeGreaterThan(0);
  });

  it("should extract fields from template", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    // Verify fields were extracted
    expect(template.fields.length).toBeGreaterThan(0);

    // Check for expected placeholder fields
    const fieldIds = template.fields.map((f: any) => f.id);
    expect(fieldIds).toContainEqual(expect.stringContaining("article"));
    expect(fieldIds).toContainEqual(expect.stringContaining("cited"));
    expect(fieldIds).toContainEqual(expect.stringContaining("cites"));
  });

  it("should extract statements from template", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    // Verify statements were extracted
    expect(template.statements.size).toBeGreaterThan(0);

    // Check for expected statements
    const statements = Array.from(template.statements.values());
    expect(
      statements.some((s: any) => s.subject.value.includes("article")),
    ).toBe(true);
    expect(statements.some((s: any) => s.object.value.includes("cited"))).toBe(
      true,
    );
  });

  it("should apply the template and match expected output exactly", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    const { signedRdf: result } = await template.applyTemplate(
      fixturesSets[0].params[0],
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(loadedFixtures[fixturesSets[0].outputs[0]]);
  });

  it("should apply emit a literal object correctly", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[1].input],
    );

    const { signedRdf: result } = await template.applyTemplate(
      fixturesSets[1].params[0],
      pubdata,
      EXAMPLE_privateKey,
    );

    // Literal placeholder should become a literal in the assertion graph
    expect(result).toContain('rdfs:comment "This is a test comment (literal)"');
    expect(result).not.toMatch(
      /rdfs:comment\s+<This is a test comment \(literal\)>/,
    );
    expect(result).toMatch(loadedFixtures[fixturesSets[1].outputs[0]]);
  });

  it("should work with repeatable statements and exclude data not related to a statement", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    const { signedRdf: result } = await template.applyTemplate(
      fixturesSets[0].params[1],
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(loadedFixtures[fixturesSets[0].outputs[1]]);
  });
});
