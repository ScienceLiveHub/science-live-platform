import { readFile } from "fs/promises";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { toTemplateValues } from "@/pages/np/create/components/templates/dataset-fields";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

/**
 * End-to-end for the Dataset form: the values the form holds, through the
 * name mapping, into the signed RDF. Guards the bug where everything typed
 * into Creators / Contributors / Contact Email was dropped and the template's
 * own placeholder nodes were published in their place.
 */
const TEMPLATE = "RAuVB37yyAuAlgusrUAoG84JI4_EfrEqIkpEZYDpSz3d8.trig";
const ORCID_A = "https://orcid.org/0000-0002-1784-2920";
const ORCID_B = "https://orcid.org/0009-0001-0203-0815";

const pubdata = {
  orcid: ORCID_A,
  name: "Test Author",
  isTest: true,
};

let template: string;
beforeAll(async () => {
  template = await readFile(join(__dirname, "fixtures", TEMPLATE), "utf8");
});

async function assertionFrom(formValues: Record<string, unknown>) {
  const t = await NanopubTemplate.loadString(template);
  const { signedRdf } = await t.generateNanopublication(
    toTemplateValues(formValues) as never,
    pubdata as never,
    EXAMPLE_privateKey,
  );
  return (signedRdf.match(/sub:assertion\s*\{[\s\S]*?\n\}/) || [""])[0];
}

const FORM = {
  fdo: "beni-canopy-height",
  label: "Canopy height for the Beni lowlands",
  description: "Forest canopy height from ESA BIOMASS, validated against GEDI.",
  domain: "http://edamontology.org/topic_3050",
};

describe("Dataset nanopublication generation", () => {
  it("publishes the creators the user entered", async () => {
    const assertion = await assertionFrom({ ...FORM, creators: [ORCID_A, ORCID_B] });
    expect(assertion).toContain(ORCID_A);
    expect(assertion).toContain(ORCID_B);
  });

  it("publishes the contact email the user entered", async () => {
    const assertion = await assertionFrom({ ...FORM, contactEmail: "data@example.org" });
    expect(assertion).toContain("data@example.org");
  });

  it("never publishes the template's own placeholder nodes as values", async () => {
    // The template's placeholders live under its URI; any of them appearing in
    // an assertion means a form field was published instead of a value.
    const assertion = await assertionFrom({ ...FORM, creators: [ORCID_A] });
    expect(assertion).not.toMatch(/RAuVB37yy\w*\/(creator|contact|contributor|fip)/);
  });

  it("still produces a valid assertion when the optional fields are left empty", async () => {
    const assertion = await assertionFrom(FORM);
    expect(assertion).toContain("FAIRDigitalObject");
    expect(assertion).toContain("Canopy height for the Beni lowlands");
  });
});
