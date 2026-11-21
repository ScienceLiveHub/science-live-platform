import { readFile } from "fs/promises";
import { Parser, Store } from "n3";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

/**
 * Nanodash's special template tokens stand for parts of the nanopublication being made.
 * The quotation template (RA24onqm…) states `nt:CREATOR cito:quotes <paper>`: the author
 * quotes the paper. Published as is, the statement was about the token itself.
 */
describe("special template tokens", () => {
  it("publishes the author's ORCID for nt:CREATOR", async () => {
    const template = await NanopubTemplate.loadString(
      await readFile(
        join(
          __dirname,
          "fixtures",
          "RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU.trig",
        ),
        "utf8",
      ),
    );
    const { signedRdf } = await template.generateNanopublication(
      {
        paper: "10.1002/wat2.1765",
        quotation:
          "there is a lack of quantitative evidence for the effectiveness of NFM interventions",
        comment: "A test comment.",
      } as never,
      {
        orcid: "https://orcid.org/0000-9999-1234-9999",
        name: "Test Author",
      } as never,
      EXAMPLE_privateKey,
    );

    expect(signedRdf).not.toContain("ntemplate/CREATOR");
    const store = new Store(
      new Parser({ format: "application/trig" }).parse(signedRdf),
    );
    const quotes = store.getQuads(
      null,
      "http://purl.org/spar/cito/quotes",
      null,
      null,
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0].subject.value).toBe(
      "https://orcid.org/0000-9999-1234-9999",
    );
    expect(quotes[0].object.value).toBe("https://doi.org/10.1002/wat2.1765");
  });
});
