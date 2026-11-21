import { describe, expect, it } from "vitest";
import { prefillFromLink } from "../src/pages/np/create/prefill-from-link";

/** A prepared nanopublication opens filled in from its link, e.g. one per cited source. */
describe("pre-filling a form from the link", () => {
  it("takes p.<field> parameters as field values, decoded", () => {
    const params = new URLSearchParams(
      "template=https%3A%2F%2Fw3id.org%2Fnp%2FRA24&p.paper=10.1002%2Fwat2.1765" +
        "&p.quotation=%22there+is+a+lack+of+quantitative+evidence%22&p.comment=NFM+%E2%80%93+454+articles",
    );
    expect(prefillFromLink(params)).toEqual({
      paper: "10.1002/wat2.1765",
      quotation: '"there is a lack of quantitative evidence"',
      comment: "NFM – 454 articles",
    });
  });

  it("ignores other parameters and gives nothing when there is nothing to fill", () => {
    expect(
      prefillFromLink(new URLSearchParams("template=x&p.=")),
    ).toBeUndefined();
    expect(prefillFromLink(new URLSearchParams(""))).toBeUndefined();
  });
});
