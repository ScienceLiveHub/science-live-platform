/**
 * Tests for the ODRL Access Policy and ODRL Access Grant templates.
 *
 * These templates use `GroupedStatement` and `RepeatableStatement` to model
 * permissions/prohibitions/duties, which requires the template engine to
 * traverse into group sub-statements and iterate over form array values.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

const ODRL_NS = "http://www.w3.org/ns/odrl/2/";
const DPV_NS = "https://w3id.org/dpv#";

const pubdata = {
  name: "Test User",
  orcid: "https://orcid.org/0000-0000-0000-0000",
  baseUri: "https://w3id.org/np/",
  timestamp: new Date("2026-04-11T12:00:00.000Z"),
};

describe("ODRL Access Policy template", () => {
  let templateTrig: string;
  let template: NanopubTemplate;

  beforeAll(async () => {
    templateTrig = await readFile(
      join(__dirname, "fixtures", "RA61D4c7-odrl-policy-template.trig"),
      "utf-8",
    );
    template = await NanopubTemplate.loadString(templateTrig);
  });

  it("loads template without crashing", () => {
    expect(template).toBeDefined();
    expect(template.fields.length).toBeGreaterThan(0);
    expect(template.statements.size).toBeGreaterThan(0);
  });

  it("extracts the expected placeholders", () => {
    const fieldIds = template.fields.map((f) => f.id);
    const expectedPlaceholders = [
      "policyUri",
      "policyType",
      "datasetUri",
      "permittedAction",
      "purposeConstraint",
      "prohibitedAction",
      "dutyAction",
      "attributionParty",
    ];
    for (const p of expectedPlaceholders) {
      expect(fieldIds.some((id) => id.endsWith(p))).toBe(true);
    }
  });

  it("generates a nanopub with a single permission", async () => {
    const { signedRdf } = await template.generateNanopublication(
      {
        policyUri: "public-demo-biodiversity",
        policyType: ODRL_NS + "Offer",
        datasetUri: "public-demo-biodiversity",
        permGroup: [
          {
            permittedAction: ODRL_NS + "use",
            purposeConstraint: DPV_NS + "AcademicResearch",
          },
        ],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    // Subject URI has the fair2adapt prefix prepended
    expect(signedRdf).toContain(
      "https://fair2adapt.eu/policy/public-demo-biodiversity",
    );
    expect(signedRdf).toContain(
      "https://fair2adapt.eu/data/public-demo-biodiversity",
    );
    // Policy type
    expect(signedRdf).toMatch(/odrl:Offer|odrl\/2\/Offer/);
    // Permission: action=use + constraint: purpose=AcademicResearch
    expect(signedRdf).toMatch(/odrl:use|odrl\/2\/use/);
    expect(signedRdf).toMatch(/dpv:AcademicResearch|dpv#AcademicResearch/);
    expect(signedRdf).toMatch(/odrl:purpose|odrl\/2\/purpose/);
    expect(signedRdf).toMatch(/odrl:eq|odrl\/2\/eq/);
  });

  it("generates a nanopub with multiple permissions, prohibitions, and a duty", async () => {
    const { signedRdf } = await template.generateNanopublication(
      {
        policyUri: "public-demo-biodiversity",
        policyType: ODRL_NS + "Offer",
        datasetUri: "public-demo-biodiversity",
        permGroup: [
          {
            permittedAction: ODRL_NS + "use",
            purposeConstraint: DPV_NS + "AcademicResearch",
          },
          {
            permittedAction: ODRL_NS + "reproduce",
            purposeConstraint: DPV_NS + "AcademicResearch",
          },
        ],
        prohibGroup: [
          { prohibitedAction: ODRL_NS + "commercialize" },
          { prohibitedAction: ODRL_NS + "sell" },
        ],
        dutyGroup: [
          {
            dutyAction: ODRL_NS + "attribute",
            attributionParty: "https://fair2adapt-eosc.eu",
          },
        ],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    console.log(
      "\n=== Full ODRL Policy (2 permissions, 2 prohibitions, 1 duty) ===\n" +
        signedRdf,
    );

    // Both permission actions
    expect(signedRdf).toMatch(/odrl:use|odrl\/2\/use/);
    expect(signedRdf).toMatch(/odrl:reproduce|odrl\/2\/reproduce/);
    // Both prohibitions
    expect(signedRdf).toMatch(/odrl:commercialize|odrl\/2\/commercialize/);
    expect(signedRdf).toMatch(/odrl:sell|odrl\/2\/sell/);
    // Duty
    expect(signedRdf).toMatch(/odrl:attribute|odrl\/2\/attribute/);
    expect(signedRdf).toContain("fair2adapt-eosc.eu");
  });

  it("skips optional empty groups", async () => {
    const { signedRdf } = await template.generateNanopublication(
      {
        policyUri: "public-demo-biodiversity",
        policyType: ODRL_NS + "Offer",
        datasetUri: "public-demo-biodiversity",
        permGroup: [
          {
            permittedAction: ODRL_NS + "use",
            purposeConstraint: DPV_NS + "AcademicResearch",
          },
        ],
        // prohibGroup and dutyGroup omitted — should not appear in output
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    // Prohibitions and duties should NOT be in the output
    expect(signedRdf).not.toMatch(/odrl:commercialize|odrl\/2\/commercialize/);
    expect(signedRdf).not.toMatch(/odrl:attribute|odrl\/2\/attribute/);
    // But the mandatory parts should still be there
    expect(signedRdf).toMatch(/odrl:use|odrl\/2\/use/);
  });
});

describe("ODRL Access Grant template", () => {
  let templateTrig: string;
  let template: NanopubTemplate;

  beforeAll(async () => {
    templateTrig = await readFile(
      join(__dirname, "fixtures", "RAeRMv6j-odrl-access-grant-template.trig"),
      "utf-8",
    );
    template = await NanopubTemplate.loadString(templateTrig);
  });

  it("loads template without crashing", () => {
    expect(template).toBeDefined();
    expect(template.fields.length).toBeGreaterThan(0);
  });

  it("generates a grant with a single permission", async () => {
    const { signedRdf } = await template.generateNanopublication(
      {
        grantUri: "grant-001",
        datasetUri: "public-demo-biodiversity",
        assigneeDid: "did:web:researcher.example.org",
        policyNanopubUri: "RA61D4c7dB5t0B1mLhc78bN2vagqYTXQiJDKY0yImRULI",
        grantTimestamp: "2026-04-11T12:00:00.000Z",
        permGroup: [{ grantedAction: ODRL_NS + "use" }],
      },
      pubdata,
      EXAMPLE_privateKey,
    );

    console.log("\n=== ODRL Access Grant ===\n" + signedRdf);

    expect(signedRdf).toContain(
      "https://fair2adapt.eu/data/public-demo-biodiversity",
    );
    expect(signedRdf).toContain("https://w3id.org/np/RA61D4c7");
    expect(signedRdf).toContain("did:web:researcher.example.org");
    expect(signedRdf).toMatch(/odrl:Agreement|odrl\/2\/Agreement/);
    expect(signedRdf).toMatch(/odrl:use|odrl\/2\/use/);
  });
});
