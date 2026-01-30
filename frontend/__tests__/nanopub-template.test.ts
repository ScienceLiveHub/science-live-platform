import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

describe("NanopubTemplate.applyTemplate", () => {
  const fixturesSets: { input: string; params: any; outputs: string[] }[] = [
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
          st01: [{ article: "Another red-herring, which should be EXCLUDED" }],
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
    {
      input: "RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE.trig",
      params: [
        {
          aida: "There are approximately 50 non-active volcanic cones in Auckland, as of 2025.",
          project:
            "https://example.oreo/RAUdtPsR9brjCBo8RC7vNIbofxnOAJH3Qxk1SAs1TL7jw",
          topic: [
            {
              uri: "https://should.not.show.in.output",
              label: "Ignored",
              description: "Should be ignored",
            },
          ],
          st1: [
            {
              topic: "http://www.wikidata.org/entity/Q726917",
            },
            {
              topic: "http://www.wikidata.org/entity/Q8072",
            },
            {
              topic: "http://www.wikidata.org/entity/Q7692360",
            },
          ],
          st2: [
            {
              dataset: "https://should.not.show.in.output",
            },
          ],
          st3: [
            {
              publication: "https://should.not.show.in.output",
            },
          ],
          dataset: "https://abcdefg.oreo/ds1",
          publication: "https://en.wikipedia.org/wiki/Auckland_volcanic_field",
        },
      ],
      outputs: ["RA4fmfVF-applyTemplate_expected_output.trig"],
    },
    {
      input: "RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao.trig",
      params: [
        {
          comment: "Quote mentions the 3 broad regions where cases were taken.",
          geometry: "na-eu-au",
          location: "northamerica-eu-australia",
          "location-label": "North America, European Union and Australia",
          paper: "10.1136/oemed-2022-108371",
          quotation:
            "We pooled data from 10 case-control studies participating in the International Lymphoma Epidemiology Consortium, including 9229 cases and 9626 controls from North America, the European Union and Australia",
          quoteType: "whole",
          wkt: "GEOMETRYCOLLECTION(POLYGON((-162.94921875000003 70.61261423801925, -169.62890625000003 62.75472592723178, -161.54296875000003 57.326521225217064, -147.83203125000003 58.99531118795094, -117.94921875000001 27.994401411046148, -76.81640625000001 25.48295117535531, -46.58203125000001 54.36775852406841, -66.97265625000001 70.02058730174062, -162.94921875000003 70.61261423801925)), POLYGON((31.113281250000004 69.53451763078358, 39.90234375000001 44.08758502824518, 20.214843750000004 35.17380831799959, -11.77734375 36.59788913307022, -11.77734375 58.63121664342478, 16.347656250000004 69.77895177646761, 31.113281250000004 69.53451763078358)), POLYGON((131.76654397038808 -10.173053808111849, 111.02435647038811 -21.972369665708793, 115.94623147038811 -36.904907337367746, 130.7118564703881 -32.57346140454925, 145.12591897038808 -43.603290590722224, 156.02435647038814 -27.711522806200023, 143.7196689703881 -10.173053808111849, 131.76654397038808 -10.173053808111849)))",
        },
      ],
      outputs: ["RAsPVd3b-applyTemplate_expected_output.trig"],
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
    for (const [, v] of Object.entries(fixturesSets)) {
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
    const fieldIds = template.fields.map((f) => f.id);
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
    expect(statements.some((s) => s.subject.value.includes("article"))).toBe(
      true,
    );
    expect(statements.some((s) => s.object.value.includes("cited"))).toBe(true);
  });

  it("should apply the template and match expected output exactly", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[0].input],
    );

    const { signedRdf: result } = await template.generateNanopublication(
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

    const { signedRdf: result } = await template.generateNanopublication(
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

    const { signedRdf: result } = await template.generateNanopublication(
      fixturesSets[0].params[1],
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(loadedFixtures[fixturesSets[0].outputs[1]]);
  });

  it("should correctly output placeholder prefixes, AutoEscapeUriPlaceholder and IntroducedResource", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[2].input],
    );

    const { signedRdf: result } = await template.generateNanopublication(
      fixturesSets[2].params[0],
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(loadedFixtures[fixturesSets[2].outputs[0]]);
  });

  it("should correctly handle LocalResource and exclude optional statements where possible", async () => {
    const template = await NanopubTemplate.loadString(
      loadedFixtures[fixturesSets[3].input],
    );

    const { signedRdf: result } = await template.generateNanopublication(
      fixturesSets[3].params[0],
      pubdata,
      EXAMPLE_privateKey,
    );

    expect(result).toMatch(loadedFixtures[fixturesSets[3].outputs[0]]);
  });
});
