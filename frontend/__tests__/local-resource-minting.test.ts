import { readFile } from "fs/promises";
import { join } from "path";
import { DataFactory, Parser, Store } from "n3";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

/**
 * A template may declare a node that belongs to the nanopublication being
 * created rather than to the outside world — `nt:LocalResource` without being a
 * placeholder, so nobody types it. The Replication Request template declares
 * one, `sub:request`, which carries the whole assertion.
 *
 * Such a node has to be minted under the new nanopublication. Keeping the
 * template's URI would make every record state its claims about a node living
 * inside the template document, so every request ever published would describe
 * the same resource.
 */
const TEMPLATE = "RAo1X8qffuzwse6EpAm3TKmM7ub2ODwifHLTpImxVdI4s.trig";
const QUOTE = "https://w3id.org/np/RAquoteExample123456789";
const SCHEMA_OBJECT = DataFactory.namedNode("https://schema.org/object");

/** The node the template declares as its local resource, resolved from the output. */
function requestNode(signedRdf: string) {
  const store = new Store(
    new Parser({ format: "application/trig" }).parse(signedRdf),
  );
  return store.getQuads(null, SCHEMA_OBJECT, null, null)[0]?.subject.value;
}

const pubdata = {
  orcid: "https://orcid.org/0000-0002-1784-2920",
  name: "Test Author",
  isTest: true,
};

let template: NanopubTemplate;
beforeAll(async () => {
  template = await NanopubTemplate.loadString(
    await readFile(join(__dirname, "fixtures", TEMPLATE), "utf8"),
  );
});

describe("local resources that are not form fields", () => {
  it("mints the node under the new nanopublication, not the template", async () => {
    const { signedRdf } = await template.generateNanopublication(
      { quote: QUOTE, st05: [], st06: [] } as never,
      pubdata as never,
      EXAMPLE_privateKey,
    );

    const node = requestNode(signedRdf);

    expect(node).toMatch(
      /^https:\/\/w3id\.org\/(sciencelive\/)?np\/RA[\w-]+\/request$/,
    );
    // Not the template's own node: statements about that would be statements
    // about the template, shared by every record ever made from it.
    expect(node).not.toContain("RAo1X8qffuzwse6EpAm3TKmM7ub2ODwifHLTpImxVdI4s");
  });

  it("leaves nodes alone when a value is supplied for them", async () => {
    // Repeatable groups pass per-iteration names this way; a supplied value
    // must win over minting.
    const { signedRdf } = await template.generateNanopublication(
      { quote: QUOTE, st05: [], st06: [] } as never,
      pubdata as never,
      EXAMPLE_privateKey,
    );
    const store = new Store(
      new Parser({ format: "application/trig" }).parse(signedRdf),
    );
    expect(
      store.getQuads(null, SCHEMA_OBJECT, DataFactory.namedNode(QUOTE), null),
    ).toHaveLength(1);
  });
});
