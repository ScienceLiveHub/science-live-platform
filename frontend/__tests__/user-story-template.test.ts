import { readFile } from "fs/promises";
import { DataFactory, Parser, Store } from "n3";
import { join } from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { NanopubStore } from "../src/lib/nanopub-store";
import { API_LABELS_KEY, NanopubTemplate } from "../src/lib/nanopub-template";
import { NS } from "../src/lib/rdf";
import { EXAMPLE_privateKey } from "../src/lib/uri";
import { extractUserStory } from "../src/pages/np/view/user-story-data";

/**
 * The FAIR2Adapt User Story template (RACciFqZ…): "As a … I want to … so that …",
 * with repeatable domains, risks and exposed sectors, an optional repeatable digital
 * object type, and the story itself minted under the new nanopub from a short name.
 * Values are given as the UserStory form submits them.
 */
// v2 (RAFwCQ_…): v1 with a climate-adaptation domain list; statements and placeholders unchanged
const TEMPLATE = "RAFwCQ_DZmx01WR4yzhzghLYK5xafhG6KmNB0Dy8jShZg.trig";
const FFF = (local: string) => `https://w3id.org/fff/${local}`;
const FLOOD =
  "http://connectivity-hub.com/terms/58d1c857-2638-477d-bc96-ce5b3afc0ee0";
const HEALTH = "https://example.org/terms/health";
const AGRICULTURE = "http://aims.fao.org/aos/agrovoc/c_203";
const ECONOMICS = "http://aims.fao.org/aos/agrovoc/c_2481";

const pubdata = {
  orcid: "https://orcid.org/0000-0002-1784-2920",
  name: "Test Author",
};

const values = {
  US: "F2A-CS2-US4",
  label: "F2A CS2 US4",
  user: "researcher",
  action: "use model outputs",
  purpose: "I can compute indicators",
  st03: [{ domain: AGRICULTURE }, { domain: ECONOMICS }],
  st04: [{ challenge: FLOOD }],
  st05: [{ exposed: HEALTH }],
  st09: [],
  [API_LABELS_KEY]: {
    [FLOOD]: "Flood",
    [HEALTH]: "Health",
    "https://example.org/not-chosen": "Not chosen",
  },
};

let template: NanopubTemplate;
let output: Store;
let signedRdf: string;
beforeAll(async () => {
  template = await NanopubTemplate.loadString(
    await readFile(join(__dirname, "fixtures", TEMPLATE), "utf8"),
  );
  ({ signedRdf } = await template.generateNanopublication(
    values as never,
    pubdata as never,
    EXAMPLE_privateKey,
  ));
  output = new Store(
    new Parser({ format: "application/trig" }).parse(signedRdf),
  );
});

const story = () =>
  output.getQuads(
    null,
    NS.RDF("type"),
    DataFactory.namedNode(FFF("User-Story")),
    null,
  )[0]?.subject.value;
const objects = (predicate: string) =>
  output
    .getQuads(story(), DataFactory.namedNode(predicate), null, null)
    .map((q) => q.object.value)
    .sort();

describe("the User Story template", () => {
  it("mints the story from its short name under the new nanopublication", () => {
    expect(story()).toMatch(
      /^https:\/\/w3id\.org\/(sciencelive\/)?np\/RA[\w-]+\/F2A-CS2-US4$/,
    );
  });

  it("writes the story's three parts and its title", () => {
    expect(objects(FFF("as-a"))).toEqual(["researcher"]);
    expect(objects(FFF("i-want-to"))).toEqual(["use model outputs"]);
    expect(objects(FFF("so-that"))).toEqual(["I can compute indicators"]);
    expect(objects(NS.RDFS("label").value)).toEqual(["F2A CS2 US4"]);
  });

  it("repeats the domain, risk and sector statements, and leaves out the empty optional one", () => {
    expect(objects(FFF("covers-domain"))).toEqual(
      [AGRICULTURE, ECONOMICS].sort(),
    );
    expect(objects(FFF("faces-challenge"))).toEqual([FLOOD]);
    expect(objects(FFF("exposed-entity"))).toEqual([HEALTH]);
    expect(
      objects(
        "https://w3id.org/fair/fip/terms/declared-for-digital-object-type",
      ),
    ).toEqual([]);
  });

  it("records the labels of picked terms the assertion uses, and only those", () => {
    const labels = output
      .getQuads(null, NS.NPTs("hasLabelFromApi"), null, null)
      .map((q) => [
        q.subject.value,
        q.object.value,
        getGraphEnd(q.graph.value),
      ]);
    expect(labels.sort()).toEqual(
      [
        [FLOOD, "Flood", "pubinfo"],
        [HEALTH, "Health", "pubinfo"],
      ].sort(),
    );
  });

  it("is labelled by the template's label pattern", () => {
    const np = output.getQuads(
      null,
      NS.RDF("type"),
      NS.NP("Nanopublication"),
      null,
    )[0]?.subject;
    expect(
      output
        .getQuads(np, NS.RDFS("label"), null, null)
        .map((q) => q.object.value),
    ).toEqual(["F2A CS2 US4"]);
  });

  it("reads back as a user story in the view", async () => {
    const store = await NanopubStore.loadString(signedRdf);
    const data = extractUserStory(store);
    expect(data).toMatchObject({
      title: "F2A CS2 US4",
      asA: "researcher",
      iWantTo: "use model outputs",
      soThat: "I can compute indicators",
      challenges: [FLOOD],
      exposed: [HEALTH],
      digitalObjectTypes: [],
    });
    expect(data?.domains.sort()).toEqual([AGRICULTURE, ECONOMICS].sort());
    // The view names picked terms from the recorded labels
    expect(store.findInternalLabel(FLOOD)).toBe("Flood");
  });
});

function getGraphEnd(uri: string) {
  return uri.split(/[/#]/).pop();
}

describe("the short name made from the title", () => {
  it("keeps letters, digits and dashes, as np-user-story-service does", async () => {
    const { shortNameFrom } =
      await import("../src/pages/np/create/components/templates/user-story-terms");
    expect(shortNameFrom("F2A CS2 US4")).toBe("F2A-CS2-US4");
    expect(shortNameFrom("  Knowledge broker: finds the stories!  ")).toBe(
      "Knowledge-broker-finds-the-stories",
    );
    expect(shortNameFrom("Évaluer les crues")).toBe("Evaluer-les-crues");
    expect(shortNameFrom("x".repeat(80))).toHaveLength(60);
    expect(shortNameFrom("???")).toBe("user-story");
  });
});

describe("template versions", () => {
  it("serves stories and the embedded form made with v1 as the current User Story", async () => {
    const { resolveTemplateUri, TEMPLATE_URI } =
      await import("../src/pages/np/create/components/templates/registry-metadata");
    expect(TEMPLATE_URI.USER_STORY).toBe(
      "https://w3id.org/np/RAFwCQ_DZmx01WR4yzhzghLYK5xafhG6KmNB0Dy8jShZg",
    );
    expect(
      resolveTemplateUri(
        "https://w3id.org/np/RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw",
      ),
    ).toBe(TEMPLATE_URI.USER_STORY);
  });

  it("restricts domains to the list v2 names", async () => {
    const { USER_STORY_DOMAIN_OPTIONS } =
      await import("../src/pages/np/create/components/templates/user-story-terms");
    const v2 = await readFile(join(__dirname, "fixtures", TEMPLATE), "utf8");
    expect(v2).toContain(
      `nt:possibleValuesFrom <${USER_STORY_DOMAIN_OPTIONS}>`,
    );
  });
});
