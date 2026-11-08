import { doiIriKey, doiKey, normalizeDoi } from "@/lib/uri";
import { describe, expect, it } from "vitest";

describe("normalizeDoi", () => {
  const bare = "10.1126/science.aax8591";

  it.each([
    bare,
    `  ${bare}  `,
    `doi:${bare}`,
    `DOI: ${bare}`,
    `https://doi.org/${bare}`,
    `http://dx.doi.org/${bare}`,
    `https://www.doi.org/${bare}`,
    `doi.org/${bare}`,
    `${bare}.`,
    `https://doi.org/10.1126%2Fscience.aax8591`,
  ])("accepts %j", (input) => {
    expect(normalizeDoi(input)).toBe(bare);
  });

  it("preserves case", () => {
    expect(normalizeDoi("10.1016/J.ECOLIND.2020.1")).toBe(
      "10.1016/J.ECOLIND.2020.1",
    );
  });

  it.each(["", "   ", "foo", "10.123/x", "10.1234/", "11.1234/x", null])(
    "rejects %j",
    (input) => {
      expect(normalizeDoi(input)).toBeNull();
    },
  );

  it("accepts Wiley SICI DOIs", () => {
    expect(
      normalizeDoi(
        "10.1002/(SICI)1097-4636(199706)35:4<403::AID-JBM1>3.0.CO;2-H",
      ),
    ).not.toBeNull();
  });
});

describe("doiKey / doiIriKey", () => {
  it("compares case-insensitively", () => {
    expect(doiKey("10.1016/J.X")).toBe(doiKey("10.1016/j.x"));
  });

  it("gives the lower-cased doi.org IRI", () => {
    expect(doiIriKey("10.3897/BDJ.10.e77516")).toBe(
      "https://doi.org/10.3897/bdj.10.e77516",
    );
  });
});
