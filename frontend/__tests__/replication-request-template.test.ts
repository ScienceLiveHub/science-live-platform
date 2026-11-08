/**
 * Tests for the Replication Request template (RAo1X8qffuzwse6EpAm3TKmM7ub2ODwifHLTpImxVdI4s).
 *
 * Exercises `generateNanopublication` with the payload shape produced by
 * `ReplicationRequest.tsx`'s onSubmit: the LocalResource subject `request`, the
 * quote link, the optional study type and approach, and the repeatable `sub:st05`
 * (datasets) and `sub:st06` (software) statements.
 */

import { readFile } from "fs/promises";
import { DataFactory, Parser, Store } from "n3";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";
import { EXAMPLE_privateKey } from "../src/lib/uri";

const { namedNode } = DataFactory;

const pubdata = {
  name: "Test User",
  orcid: "https://orcid.org/0000-0000-0000-0000",
  baseUri: "https://w3id.org/np/",
  timestamp: new Date("2026-10-12T12:00:00.000Z"),
};

const SCHEMA = (l: string) => namedNode(`https://schema.org/${l}`);
const SL = (l: string) =>
  namedNode(`https://w3id.org/sciencelive/o/terms/${l}`);
const RDF_TYPE = namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");

// The natural-regeneration quote (step 01 of a published FORRT chain)
const QUOTE =
  "https://w3id.org/sciencelive/np/RAIzfxXAB5b95Wr0YNsqBDC2dXuYLjwSpnePtLMsoKghk";

/** Parse the signed TriG and return the assertion quads with the request node. */
function parse(signedRdf: string) {
  const store = new Store(
    new Parser({ format: "application/trig" }).parse(signedRdf),
  );
  const objectQuad = store.getQuads(null, SCHEMA("object"), null, null)[0];
  return { store, request: objectQuad?.subject, graph: objectQuad?.graph };
}

describe("Replication Request template", () => {
  let template: NanopubTemplate;

  beforeAll(async () => {
    const trig = await readFile(
      join(
        __dirname,
        "fixtures",
        "RAo1X8qffuzwse6EpAm3TKmM7ub2ODwifHLTpImxVdI4s.trig",
      ),
      "utf-8",
    );
    template = await NanopubTemplate.loadString(trig);
  });

  it("extracts all expected placeholders", () => {
    const fieldIds = template.fields.map((f) => f.id);
    for (const p of ["quote", "studyType", "dataset", "software", "approach"]) {
      expect(fieldIds.some((id) => id.endsWith(`/${p}`))).toBe(true);
    }
  });

  it("generates a minimal request (quote only)", async () => {
    const { signedRdf } = await template.generateNanopublication(
      { quote: QUOTE, st05: [], st06: [] },
      pubdata,
      EXAMPLE_privateKey,
    );
    const { store, request, graph } = parse(signedRdf);

    // <nanopub>/request is a potential CheckAction on the quote
    expect(request?.value).toMatch(
      /^https:\/\/w3id\.org\/(sciencelive\/)?np\/RA[\w-]+\/request$/,
    );
    expect(
      store.getQuads(request, RDF_TYPE, SCHEMA("CheckAction"), graph),
    ).toHaveLength(1);
    expect(
      store.getQuads(
        request,
        SCHEMA("actionStatus"),
        SCHEMA("PotentialActionStatus"),
        graph,
      ),
    ).toHaveLength(1);
    expect(
      store.getQuads(request, SCHEMA("object"), namedNode(QUOTE), graph),
    ).toHaveLength(1);

    // Optional statements with no value are left out
    expect(
      store.getQuads(request, SCHEMA("additionalType"), null, graph),
    ).toHaveLength(0);
    expect(
      store.getQuads(request, SL("hasInputDataSource"), null, graph),
    ).toHaveLength(0);
    expect(
      store.getQuads(request, SL("usesSoftwarePackage"), null, graph),
    ).toHaveLength(0);
    expect(
      store.getQuads(request, SCHEMA("description"), null, graph),
    ).toHaveLength(0);
  });

  it("generates a full request with type, datasets, software and approach", async () => {
    const ds1 = "https://doi.org/10.5281/zenodo.7428804";
    const ds2 = "https://example.org/data/two";
    const sw = "https://www.wikidata.org/wiki/Q580605";
    const { signedRdf } = await template.generateNanopublication(
      {
        quote: QUOTE,
        studyType: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
        st05: [{ dataset: ds1 }, { dataset: ds2 }],
        st06: [{ software: sw }],
        approach: "Recompute the Colombia total from the authors' outputs.",
      },
      pubdata,
      EXAMPLE_privateKey,
    );
    const { store, request, graph } = parse(signedRdf);

    expect(
      store.getQuads(
        request,
        SCHEMA("additionalType"),
        SL("Reproduction-Study"),
        graph,
      ),
    ).toHaveLength(1);
    const datasets = store
      .getQuads(request, SL("hasInputDataSource"), null, graph)
      .map((q) => q.object.value)
      .sort();
    expect(datasets).toEqual([ds2, ds1].sort());
    expect(
      store.getQuads(request, SL("usesSoftwarePackage"), namedNode(sw), graph),
    ).toHaveLength(1);
    const notes = store.getQuads(request, SCHEMA("description"), null, graph);
    expect(notes).toHaveLength(1);
    expect(notes[0].object.termType).toBe("Literal");
  });

  it("records the template it was created from", async () => {
    const { signedRdf } = await template.generateNanopublication(
      { quote: QUOTE, st05: [], st06: [] },
      pubdata,
      EXAMPLE_privateKey,
    );
    expect(signedRdf).toContain(
      "RAo1X8qffuzwse6EpAm3TKmM7ub2ODwifHLTpImxVdI4s",
    );
  });
});
