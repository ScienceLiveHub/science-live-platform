import { describe, expect, it } from "vitest";
import { toTemplateValues } from "@/pages/np/create/components/templates/dataset-fields";

const A = "https://orcid.org/0000-0002-1784-2920";
const B = "https://orcid.org/0009-0001-0203-0815";

describe("Dataset form → template placeholder names", () => {
  it("sends creators as the template's repeatable statement, one row each", () => {
    expect(toTemplateValues({ creators: [A, B] })).toEqual({
      st6: [{ creator: A }, { creator: B }],
    });
  });

  it("sends contributors the same way", () => {
    expect(toTemplateValues({ contributors: [B] })).toEqual({
      st7: [{ contributor: B }],
    });
  });

  it("renames contactEmail and fairProfile to the template's placeholders", () => {
    expect(toTemplateValues({ contactEmail: "a@b.org", fairProfile: "FIP-1" })).toEqual({
      contact: "a@b.org",
      fip: "FIP-1",
    });
  });

  it("drops empty rows rather than emitting blank statements", () => {
    expect(toTemplateValues({ creators: ["", "  "], contributors: [], contactEmail: "" })).toEqual(
      {},
    );
  });

  it("passes through the fields whose names already match", () => {
    const v = {
      fdo: "10.57780/bio-65e97bc",
      label: "Canopy height",
      description: "D",
      domain: "http://edamontology.org/topic_3050",
      version: "1.0",
      publisher: "https://ror.org/01abc",
      project: "https://w3id.org/sciencelive/np/RAzN11",
    };
    expect(toTemplateValues({ ...v })).toEqual(v);
  });

  it("trims whitespace the user leaves in a pasted ORCID", () => {
    expect(toTemplateValues({ creators: [` ${A} `] })).toEqual({ st6: [{ creator: A }] });
  });
});
