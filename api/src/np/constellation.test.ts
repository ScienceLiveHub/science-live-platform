/**
 * Tests for the BFS constellation builder.
 *
 * Mocks global fetch to return canned SPARQL + TriG responses for a synthetic
 * 4-node FORRT chain shaped like:
 *
 *   Apex CiTO  ──refersTo──▶  Outcome  ──(only in TriG)──▶  Claim
 *        │                                                     │
 *        └────────────(only in TriG)──── Quote ◀───refersTo────┘
 *
 * Regression targets:
 *   - Outcome→Claim edge lives only in the TriG body, NOT in the SPARQL
 *     networkGraph index. The mining step has to surface it (14/19→19/19
 *     bug from session #1).
 *   - Template-definition nanopubs ("Defining a/an …") don't expand outward.
 *   - maxNodes / depthLimit caps are honoured.
 *   - SPARQL 503 retry stays correct under the BFS traversal load.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildConstellation, classifyStepKind } from "./constellation";

// Tiny FORRT-shaped graph used as fixture across the tests.
const APEX = "https://w3id.org/sciencelive/np/RAapex0000000000000000000000000000000000000";
const OUTCOME = "https://w3id.org/sciencelive/np/RAoutcome000000000000000000000000000000000";
const CLAIM = "https://w3id.org/sciencelive/np/RAclaim00000000000000000000000000000000000";
const QUOTE = "https://w3id.org/sciencelive/np/RAquote00000000000000000000000000000000000";

const TPL_CITO = "https://w3id.org/np/RAtplCito00000000000000000000000000000000000";
const TPL_OUTCOME = "https://w3id.org/np/RAtplOutcome00000000000000000000000000000000";
const TPL_CLAIM = "https://w3id.org/np/RAtplClaim000000000000000000000000000000000000";
const TPL_QUOTE = "https://w3id.org/np/RAtplQuote000000000000000000000000000000000000";

function trigFor(self: string, body: string, templateUri: string): string {
  return `
@prefix this: <${self}> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

sub:assertion {
  ${body}
}

sub:pubinfo {
  this: nt:wasCreatedFromTemplate <${templateUri}> .
}
`;
}

function tplTrigFor(label: string): string {
  // Minimal template TriG — the canonical AssertionTemplate-block label is
  // what extractTemplateLabel picks up.
  return `
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

sub:assertion {
  sub:assertion a nt:AssertionTemplate;
    rdfs:label "${label}";
    nt:hasStatement sub:st01 .
}
`;
}

function sparqlBindings(rows: { np: string; template?: string }[]): string {
  return JSON.stringify({
    results: {
      bindings: rows.map((r) => ({
        np: { type: "uri", value: r.np },
        ...(r.template
          ? { template: { type: "uri", value: r.template } }
          : {}),
      })),
    },
  });
}

const SPARQL_URL = "https://query.knowledgepixels.com/repo/full";

/**
 * Synthetic KP — returns canned bodies for known URIs. The chain shape:
 *   - Apex refersToNanopub Outcome (SPARQL says so).
 *   - Outcome's TriG body references Claim (NOT in SPARQL networkGraph).
 *   - Claim's TriG body references Quote (NOT in SPARQL networkGraph).
 *   - All four are real chain steps; templates are not.
 */
function makeMockKp() {
  const trigMap: Record<string, string> = {
    [`https://w3id.org/np/${APEX.split("/").pop()}`]: trigFor(
      APEX,
      `<${APEX}> <https://example.org/aboutOutcome> <${OUTCOME}> .`,
      TPL_CITO,
    ),
    [`https://w3id.org/np/${OUTCOME.split("/").pop()}`]: trigFor(
      OUTCOME,
      `<${OUTCOME}> <https://example.org/targetsClaim> <${CLAIM}> .`,
      TPL_OUTCOME,
    ),
    [`https://w3id.org/np/${CLAIM.split("/").pop()}`]: trigFor(
      CLAIM,
      `<${CLAIM}> <https://example.org/quotesPaper> <${QUOTE}> .`,
      TPL_CLAIM,
    ),
    [`https://w3id.org/np/${QUOTE.split("/").pop()}`]: trigFor(
      QUOTE,
      `<${QUOTE}> a <https://example.org/Quote> .`,
      TPL_QUOTE,
    ),
    [TPL_CITO]: tplTrigFor("Declare citations with CiTO"),
    [TPL_OUTCOME]: tplTrigFor(
      "Declaring a replication study outcome according to FORRT",
    ),
    [TPL_CLAIM]: tplTrigFor("Declaring an original claim according to FORRT"),
    [TPL_QUOTE]: tplTrigFor(
      "Annotating a paper quotation with personal interpretation",
    ),
  };

  // Networkgraph edges that KP would materialise — note Outcome→Claim and
  // Claim→Quote are MISSING here on purpose. That's the bug class we mine
  // from TriG bodies to bridge.
  const sparqlEdges: Record<string, { references: string[]; referencedBy: string[] }> = {
    [APEX]: { references: [OUTCOME], referencedBy: [] },
    [OUTCOME]: { references: [], referencedBy: [APEX] },
    [CLAIM]: { references: [], referencedBy: [] },
    [QUOTE]: { references: [], referencedBy: [] },
  };

  return {
    fetch: vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();

      // SPARQL query
      if (urlStr === SPARQL_URL) {
        const body = init?.body;
        const queryText =
          body instanceof URLSearchParams
            ? body.get("query") ?? ""
            : String(body ?? "");
        // Extract the URI from the bracketed `<URI>` substitution.
        const uriMatch = /<([^>]+)>/.exec(queryText);
        const uri = uriMatch?.[1] ?? "";
        const edges = sparqlEdges[uri] ?? { references: [], referencedBy: [] };
        // Detect direction by which side of `npa:refersToNanopub` carries
        // the URI literal — `<URI> refersToNanopub ?np` is the outgoing
        // query; `?np refersToNanopub <URI>` is the incoming query.
        const useReferences = /<[^>]+>\s+npa:refersToNanopub\s+\?np/.test(
          queryText,
        );
        const rows = useReferences ? edges.references : edges.referencedBy;
        return new Response(
          sparqlBindings(rows.map((np) => ({ np }))),
          {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          },
        );
      }

      // TriG resolver
      const body = trigMap[urlStr];
      if (body) {
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/trig" },
        });
      }

      return new Response("not found", { status: 404 });
    }),
    trigMap,
  };
}

describe("buildConstellation", () => {
  let kp: ReturnType<typeof makeMockKp>;

  beforeEach(() => {
    kp = makeMockKp();
    vi.stubGlobal("fetch", kp.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reaches all 4 nodes via SPARQL + TriG mining", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });

    expect(c.nodeCount).toBe(4);
    expect(c.nodes.map((n) => n.uri).sort()).toEqual(
      [APEX, OUTCOME, CLAIM, QUOTE].sort(),
    );
  });

  it("surfaces TriG-only edges that KP networkGraph misses", async () => {
    // Regression for the 14/19→19/19 bug. Outcome→Claim is NOT in the
    // sparqlEdges fixture, only in the Outcome's TriG body. If TriG mining
    // is removed, Claim and Quote disappear from the result.
    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    const uris = c.nodes.map((n) => n.uri);
    expect(uris).toContain(CLAIM);
    expect(uris).toContain(QUOTE);
  });

  it("attaches the correct template-derived stepType to each node", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    const byUri = new Map(c.nodes.map((n) => [n.uri, n.stepType]));
    expect(byUri.get(APEX)).toBe("Declare citations with CiTO");
    expect(byUri.get(OUTCOME)).toBe(
      "Declaring a replication study outcome according to FORRT",
    );
    expect(byUri.get(CLAIM)).toBe(
      "Declaring an original claim according to FORRT",
    );
    expect(byUri.get(QUOTE)).toBe(
      "Annotating a paper quotation with personal interpretation",
    );
  });

  it("honours maxNodes cap", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 2,
      concurrency: 2,
    });
    expect(c.nodeCount).toBeLessThanOrEqual(2);
  });

  it("does not expand past depthLimit", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 1,
      maxNodes: 80,
      concurrency: 2,
    });
    // depth 0 = apex; depth 1 = outcome (via SPARQL) AND its TriG-mined
    // edge to Claim. Quote is reachable only from Claim (depth 2), so it
    // should not be present.
    expect(c.nodes.map((n) => n.uri)).not.toContain(QUOTE);
  });
});

// =============================================================================
// BOUNDARY + EDGE CASES — round 2
// =============================================================================

describe("buildConstellation edge cases", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not infinite-loop on cycles (A → B → A)", async () => {
    const A = "https://w3id.org/sciencelive/np/RAcycleA000000000000000000000000000000000000";
    const B = "https://w3id.org/sciencelive/np/RAcycleB000000000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplCycle00000000000000000000000000000000000";

    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${A.split("/").pop()}`]: trigFor(
        A,
        `<${A}> <http://example.org/cycles> <${B}> .`,
        TPL,
      ),
      [`https://w3id.org/np/${B.split("/").pop()}`]: trigFor(
        B,
        `<${B}> <http://example.org/cycles> <${A}> .`,
        TPL,
      ),
      [TPL]: tplTrigFor("Cycle Template"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL) {
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        }
        const body = trigMap[u];
        if (body) {
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        }
        return new Response("nf", { status: 404 });
      }),
    );

    const c = await buildConstellation(A, {
      depthLimit: 10,
      maxNodes: 50,
      concurrency: 2,
    });
    // Cycle should resolve to exactly 2 nodes — A and B, neither re-processed.
    expect(c.nodeCount).toBe(2);
    expect(c.nodes.map((n) => n.uri).sort()).toEqual([A, B].sort());
  });

  it("template-DEFINITION nodes do not expand outward", async () => {
    // Entry is a real chain step that references a template-DEFINITION
    // nanopub. The template-def MUST be added to nodes (it's a neighbour)
    // but its OWN neighbours (which the fixture provides) must NOT appear.
    const ENTRY = "https://w3id.org/sciencelive/np/RAentry000000000000000000000000000000000000";
    const TDEF = "https://w3id.org/sciencelive/np/RAtdef00000000000000000000000000000000000000";
    const POISON = "https://w3id.org/sciencelive/np/RApoison0000000000000000000000000000000000";
    const TPL_DEF_LABEL = "https://w3id.org/np/RAtplDef000000000000000000000000000000000000";
    const TPL_NORMAL = "https://w3id.org/np/RAtplNormal0000000000000000000000000000000000";

    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${ENTRY.split("/").pop()}`]: trigFor(
        ENTRY,
        `<${ENTRY}> <http://example.org/uses> <${TDEF}> .`,
        TPL_NORMAL,
      ),
      [`https://w3id.org/np/${TDEF.split("/").pop()}`]: trigFor(
        TDEF,
        `<${TDEF}> <http://example.org/poison-edge> <${POISON}> .`,
        TPL_DEF_LABEL,
      ),
      [`https://w3id.org/np/${POISON.split("/").pop()}`]: trigFor(
        POISON,
        `<${POISON}> a <http://example.org/Thing> .`,
        TPL_NORMAL,
      ),
      [TPL_DEF_LABEL]: tplTrigFor("Defining an assertion template"),
      [TPL_NORMAL]: tplTrigFor("A normal chain step template"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL) {
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        }
        const body = trigMap[u];
        if (body) {
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        }
        return new Response("nf", { status: 404 });
      }),
    );

    const c = await buildConstellation(ENTRY, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    const uris = c.nodes.map((n) => n.uri);
    expect(uris).toContain(ENTRY);
    expect(uris).toContain(TDEF);
    // POISON is reachable only via the template-def's outgoing edge —
    // the expand-stop heuristic must block it.
    expect(uris).not.toContain(POISON);
  });

  it("returns an empty constellation when the entry URI is unreachable (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const c = await buildConstellation(
      "https://w3id.org/sciencelive/np/RA404404404404404404404404404404404404404404",
      { depthLimit: 5, maxNodes: 80, concurrency: 2 },
    );
    expect(c.nodeCount).toBe(0);
    expect(c.edges).toEqual([]);
    expect(c.externalCitations).toEqual([]);
  });

  it("a TriG that self-references its own URI does not produce a self-edge", async () => {
    const SELF =
      "https://w3id.org/sciencelive/np/RAselfRef00000000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplSelf00000000000000000000000000000000000";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${SELF.split("/").pop()}`)
          return new Response(
            trigFor(SELF, `<${SELF}> <http://example.org/self> <${SELF}> .`, TPL),
            { status: 200, headers: { "content-type": "application/trig" } },
          );
        if (u === TPL)
          return new Response(tplTrigFor("Self-ref template"), {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        return new Response("nf", { status: 404 });
      }),
    );

    const c = await buildConstellation(SELF, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.nodeCount).toBe(1);
    expect(c.edges.filter((e) => e.source === e.target)).toEqual([]);
  });

  it("accumulates external citations across all visited nodes", async () => {
    const A = "https://w3id.org/sciencelive/np/RAextcitA00000000000000000000000000000000000";
    const B = "https://w3id.org/sciencelive/np/RAextcitB00000000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplExt000000000000000000000000000000000000";

    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${A.split("/").pop()}`]: trigFor(
        A,
        `<${A}> dct:references <https://doi.org/10.1126/science.aax8591>, <${B}> .`,
        TPL,
      ),
      [`https://w3id.org/np/${B.split("/").pop()}`]: trigFor(
        B,
        `<${B}> dct:references <https://doi.org/10.5281/zenodo.20113777> .`,
        TPL,
      ),
      [TPL]: tplTrigFor("Citation template"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        const body = trigMap[u];
        if (body)
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        return new Response("nf", { status: 404 });
      }),
    );

    const c = await buildConstellation(A, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.externalCitations.sort()).toEqual([
      "https://doi.org/10.1126/science.aax8591",
      "https://doi.org/10.5281/zenodo.20113777",
    ]);
  });

  it("concurrency=1 produces the same node set as concurrency=8", async () => {
    // Re-uses the 4-node FORRT fixture. Run twice with different concurrency
    // levels; node sets must match.
    const kp1 = makeMockKp();
    vi.stubGlobal("fetch", kp1.fetch);
    const c1 = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 1,
    });
    vi.unstubAllGlobals();

    const kp2 = makeMockKp();
    vi.stubGlobal("fetch", kp2.fetch);
    const c2 = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 8,
    });

    expect(new Set(c1.nodes.map((n) => n.uri))).toEqual(
      new Set(c2.nodes.map((n) => n.uri)),
    );
  });

  it("recovers from a transient SPARQL 503 mid-traversal", async () => {
    // First call to a node's SPARQL fails with 503; retry succeeds; the
    // BFS continues and reaches all 4 nodes.
    const kp = makeMockKp();
    let sparqlCallCount = 0;
    const originalFetch = kp.fetch;
    const flakyFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u === SPARQL_URL) {
        sparqlCallCount++;
        if (sparqlCallCount === 2) {
          // Inject one transient failure on the second SPARQL call.
          return new Response("503", { status: 503 });
        }
      }
      return originalFetch(url, init);
    });
    vi.stubGlobal("fetch", flakyFetch);

    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.nodeCount).toBe(4);
  });

  it("an empty entry URI string causes the constellation to be empty", async () => {
    // buildConstellation is called with a pre-validated URI by the HTTP
    // route, but defensive guard: if somehow an empty string slips through,
    // we should NOT crash. The TriG fetch will fail and the BFS terminates.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nf", { status: 404 })),
    );
    const c = await buildConstellation("", {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.nodeCount).toBe(0);
  });
});

// =============================================================================
// STRUCTURED CHAINS[] ASSEMBLY (Phase A — start-a-new-replication payload)
// =============================================================================

describe("classifyStepKind", () => {
  it("maps each FORRT template label to its step kind", () => {
    const cases: [string, ReturnType<typeof classifyStepKind>][] = [
      [
        "Declaring a replication study outcome according to FORRT",
        "outcome",
      ],
      ["Declaring a replication study design according to FORRT", "study"],
      ["Declaring an original claim according to FORRT", "claim"],
      [
        "Annotating a paper quotation with personal interpretation",
        "quote",
      ],
      [
        "Expressing a statement about research as an AIDA sentence",
        "aida",
      ],
      ["Declare citations with CiTO", "cito"],
      ["Describing research software at summary level - simple", "research-software"],
      ["Science Live Research Synthesis", "research-synthesis"],
    ];
    for (const [label, expected] of cases) {
      expect(classifyStepKind(label)).toBe(expected);
    }
  });

  it("returns 'other' for unrecognised labels", () => {
    expect(classifyStepKind("Some unrelated template")).toBe("other");
    expect(classifyStepKind("")).toBe("other");
  });

  it("is case-insensitive", () => {
    expect(classifyStepKind("DECLARING A REPLICATION STUDY OUTCOME according to forrt")).toBe(
      "outcome",
    );
  });
});

describe("buildConstellation chain assembly", () => {
  // Full FORRT chain fixture: one chain anchored by an Outcome, with each
  // FORRT step shaped like real Bombus chain data so the structured field
  // extractors and chain linkage are exercised end-to-end.
  const APEX =
    "https://w3id.org/sciencelive/np/RAapexCito000000000000000000000000000000";
  const QUOTE =
    "https://w3id.org/sciencelive/np/RAquoteAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const AIDA =
    "https://w3id.org/sciencelive/np/RAaidaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const CLAIM =
    "https://w3id.org/sciencelive/np/RAclaimAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const STUDY =
    "https://w3id.org/sciencelive/np/RAstudyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const OUTCOME =
    "https://w3id.org/sciencelive/np/RAoutcomeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const CITO_OUTCOME =
    "https://w3id.org/sciencelive/np/RAcitoOutAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const RS = "https://w3id.org/sciencelive/np/RArsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const SYNTHESIS =
    "https://w3id.org/sciencelive/np/RAsynthesisAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const PAPER_DOI = "https://doi.org/10.1126/science.aax8591";
  const ZENODO_DOI = "https://doi.org/10.5281/zenodo.20113787";
  const AIDA_URI =
    "http://purl.org/aida/Projected%20Iberian%20Bombus%20extirpation%20risk%20is%20grid-sensitive.";

  function tplOf(label: string): string {
    return `https://w3id.org/np/${label.replace(/[^A-Za-z]/g, "")}T0000000000000000000000`;
  }
  const TPL_APEX = tplOf("Declare citations with CiTO");
  const TPL_OUTCOME = tplOf("Declaring a replication study outcome according to FORRT");
  const TPL_STUDY = tplOf("Declaring a replication study design according to FORRT");
  const TPL_CLAIM = tplOf("Declaring an original claim according to FORRT");
  const TPL_QUOTE = tplOf("Annotating a paper quotation with personal interpretation");
  const TPL_AIDA = tplOf("Expressing a statement about research as an AIDA sentence");
  const TPL_CITO = tplOf("Declare citations with CiTO");
  const TPL_RS = tplOf("Describing research software at summary level - simple");
  const TPL_SYNTH = tplOf("Science Live Research Synthesis");

  function tplTrig(label: string): string {
    return `
sub:assertion {
  sub:assertion a nt:AssertionTemplate;
    rdfs:label "${label}" .
}
`;
  }

  function bodyApexCito(): string {
    return `
@prefix this: <${APEX}> .
sub:assertion {
  <${APEX}> a <https://schema.org/CreativeWork>;
    <http://purl.org/spar/cito/qualifies> <${PAPER_DOI}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_APEX}> .
}
`;
  }

  function bodyOutcome(): string {
    return `
@prefix this: <${OUTCOME}> .
sub:assertion {
  <${OUTCOME}> a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Outcome>;
    <http://www.w3.org/2000/01/rdf-schema#label> "TEI projection is grid-coupled for low-N species";
    <https://w3id.org/sciencelive/o/terms/hasConclusionDescription> """Per-species rankings are grid-coupled at projection time for species below the cell-count threshold.""";
    <https://w3id.org/sciencelive/o/terms/hasEvidenceDescription> """Five projection variants tested; main-effects-only at n>=10 yields Spearman rho=+0.97.""";
    <https://w3id.org/sciencelive/o/terms/hasLimitationsDescription> """Three substrates only; one region.""";
    <https://w3id.org/sciencelive/o/terms/hasValidationStatus> <https://w3id.org/sciencelive/o/terms/PartiallySupported>;
    <https://w3id.org/sciencelive/o/terms/hasConfidenceLevel> <https://w3id.org/sciencelive/o/terms/HighConfidence>;
    <https://w3id.org/sciencelive/o/terms/hasOutcomeRepository> <${ZENODO_DOI}>;
    <https://w3id.org/sciencelive/o/terms/isOutcomeOf> <${STUDY}/some-subject-name>;
    <http://schema.org/endDate> "2026-05-09"^^xsd:date .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_OUTCOME}> .
}
`;
  }

  function bodyStudy(): string {
    return `
@prefix this: <${STUDY}> .
sub:assertion {
  <${STUDY}> a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Study>;
    <https://w3id.org/sciencelive/o/terms/hasScopeDescription> "Iberian Bombus, three substrates, SSP3-7.0 projection";
    <https://w3id.org/sciencelive/o/terms/hasMethodologyDescription> "GLMM with main-effects-only projection extrapolation";
    <https://w3id.org/sciencelive/o/terms/hasDeviationDescription> "Drop interaction terms at projection time only";
    <https://w3id.org/sciencelive/o/terms/targetsClaim> <${CLAIM}/some-subject-name> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_STUDY}> .
}
`;
  }

  function bodyClaim(): string {
    return `
@prefix this: <${CLAIM}> .
sub:assertion {
  <${CLAIM}> a <https://w3id.org/sciencelive/o/terms/model_performance-FORRT-Claim>;
    <https://w3id.org/sciencelive/o/terms/asAidaStatement> <${AIDA_URI}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_CLAIM}> .
}
`;
  }

  function bodyQuote(): string {
    return `
@prefix this: <${QUOTE}> .
sub:assertion {
  <${QUOTE}> <http://purl.org/spar/cito/hasQuotedText> "Increasing frequency of hotter temperatures predicts species declines.";
    <http://purl.org/spar/cito/cites> <${PAPER_DOI}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_QUOTE}> .
}
`;
  }

  function bodyAida(): string {
    return `
@prefix this: <${AIDA}> .
sub:assertion {
  <${AIDA_URI}> a <http://purl.org/petapico/o/hycl#AIDA-Sentence> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_AIDA}> .
}
`;
  }

  function bodyCitoOutcome(): string {
    return `
@prefix this: <${CITO_OUTCOME}> .
sub:assertion {
  <${OUTCOME}> a <https://schema.org/CreativeWork>;
    <http://purl.org/spar/cito/extends> <${PAPER_DOI}>;
    <http://purl.org/spar/cito/qualifies> <${PAPER_DOI}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_CITO}> .
}
`;
  }

  function bodyRs(): string {
    return `
@prefix this: <${RS}> .
sub:assertion {
  <${RS}> a <http://purl.org/dc/dcmitype/Software>;
    <http://www.w3.org/2000/01/rdf-schema#label> "weatherxbiodiversity-projection";
    <http://schema.org/codeRepository> <https://github.com/annefou/weatherxbiodiversity-projection>;
    <http://purl.org/spar/cito/supports> <${CLAIM}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_RS}> .
}
`;
  }

  function bodySynthesis(): string {
    return `
@prefix this: <${SYNTHESIS}> .
sub:assertion {
  <${SYNTHESIS}> a <https://w3id.org/sciencelive/o/terms/Research-Synthesis>;
    <http://www.w3.org/2000/01/rdf-schema#label> "TEI mechanism is substrate-robust at fit but grid-coupled at projection";
    <https://w3id.org/sciencelive/o/terms/hasSynthesisDescription> """The mechanism resolves into two empirically distinct claims.""";
    <https://w3id.org/sciencelive/o/terms/hasConditionsDescription> """Iberian peninsula, three substrates.""";
    <https://w3id.org/sciencelive/o/terms/hasLimitationsDescription> """Three substrates only.""";
    <https://w3id.org/sciencelive/o/terms/hasRecommendationDescription> """Filter to species with at least 10 occupied cells.""";
    <http://purl.org/spar/cito/isSupportedBy> <${OUTCOME}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_SYNTH}> .
}
`;
  }

  function makeFullChainKp() {
    // Each nanopub's TriG references its parent in the chain, so the BFS
    // can walk from APEX downward via TriG-mining (no SPARQL networkGraph
    // dependency in the fixture).
    const inject = (base: string, refs: string[]) =>
      base.replace(
        "}\nsub:pubinfo",
        refs.map((r) => `  <${r}> a <foo> .`).join("\n") + "\n}\nsub:pubinfo",
      );

    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${APEX.split("/").pop()}`]: inject(
        bodyApexCito(),
        [SYNTHESIS],
      ),
      [`https://w3id.org/np/${SYNTHESIS.split("/").pop()}`]: inject(
        bodySynthesis(),
        [OUTCOME],
      ),
      [`https://w3id.org/np/${OUTCOME.split("/").pop()}`]: inject(
        bodyOutcome(),
        [STUDY, CITO_OUTCOME, RS],
      ),
      [`https://w3id.org/np/${STUDY.split("/").pop()}`]: inject(bodyStudy(), [
        CLAIM,
      ]),
      [`https://w3id.org/np/${CLAIM.split("/").pop()}`]: inject(bodyClaim(), [
        AIDA,
      ]),
      [`https://w3id.org/np/${AIDA.split("/").pop()}`]: inject(bodyAida(), [
        QUOTE,
      ]),
      [`https://w3id.org/np/${QUOTE.split("/").pop()}`]: bodyQuote(),
      [`https://w3id.org/np/${CITO_OUTCOME.split("/").pop()}`]:
        bodyCitoOutcome(),
      [`https://w3id.org/np/${RS.split("/").pop()}`]: bodyRs(),
      [TPL_APEX]: tplTrig("Declare citations with CiTO"),
      [TPL_OUTCOME]: tplTrig(
        "Declaring a replication study outcome according to FORRT",
      ),
      [TPL_STUDY]: tplTrig(
        "Declaring a replication study design according to FORRT",
      ),
      [TPL_CLAIM]: tplTrig("Declaring an original claim according to FORRT"),
      [TPL_QUOTE]: tplTrig(
        "Annotating a paper quotation with personal interpretation",
      ),
      [TPL_AIDA]: tplTrig(
        "Expressing a statement about research as an AIDA sentence",
      ),
      [TPL_CITO]: tplTrig("Declare citations with CiTO"),
      [TPL_RS]: tplTrig(
        "Describing research software at summary level - simple",
      ),
      [TPL_SYNTH]: tplTrig("Science Live Research Synthesis"),
    };

    return vi.fn(async (url: string | URL | Request) => {
      const u = typeof url === "string" ? url : url.toString();
      if (u === SPARQL_URL)
        return new Response(sparqlBindings([]), {
          status: 200,
          headers: { "content-type": "application/sparql-results+json" },
        });
      const body = trigMap[u];
      if (body)
        return new Response(body, {
          status: 200,
          headers: { "content-type": "application/trig" },
        });
      return new Response("nf", { status: 404 });
    });
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", makeFullChainKp());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("identifies the apex CiTO from the entry URI", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.apexCito).not.toBeNull();
    expect(c.apexCito?.uri).toBe(APEX);
    expect(c.apexCito?.relations).toEqual(["qualifies"]);
    expect(c.apexCito?.citedTargets).toContain(PAPER_DOI);
  });

  it("identifies the Research Synthesis", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.researchSynthesis).not.toBeNull();
    expect(c.researchSynthesis?.uri).toBe(SYNTHESIS);
    expect(c.researchSynthesis?.synthesis).toMatch(
      /resolves into two empirically distinct claims/,
    );
    expect(c.researchSynthesis?.recommendations).toMatch(
      /at least 10 occupied cells/,
    );
  });

  it("picks the paper DOI (deprioritising Zenodo artefact DOIs)", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.paperDoi).toBe(PAPER_DOI);
  });

  it("produces a chain with every FORRT step in order", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.chains).toHaveLength(1);
    const steps = c.chains[0].steps.map((s) => s.step);
    expect(steps).toEqual([
      "Quote",
      "AIDA",
      "Claim",
      "Study",
      "Outcome",
      "CiTO",
      "ResearchSoftware",
    ]);
  });

  it("carries the FORRT Outcome verdict + confidence on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.chains[0].outcomeVerdict).toBe("PartiallySupported");
    expect(c.chains[0].outcomeConfidence).toBe("HighConfidence");
  });

  it("carries the outcome-level CiTO relations on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.chains[0].citoRelations.sort()).toEqual([
      "extends",
      "qualifies",
    ]);
  });

  it("carries the Outcome's Zenodo repository on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    const outcomeStep = c.chains[0].steps.find((s) => s.step === "Outcome");
    expect(outcomeStep?.repository).toBe(ZENODO_DOI);
  });

  it("carries the Research Software's GitHub URL on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    const rsStep = c.chains[0].steps.find((s) => s.step === "ResearchSoftware");
    expect(rsStep?.repository).toBe(
      "https://github.com/annefou/weatherxbiodiversity-projection",
    );
  });

  it("carries the Quote's verbatim text on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    const quoteStep = c.chains[0].steps.find((s) => s.step === "Quote");
    expect(quoteStep?.text).toBe(
      "Increasing frequency of hotter temperatures predicts species declines.",
    );
  });

  it("carries the Claim's type on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    const claimStep = c.chains[0].steps.find((s) => s.step === "Claim");
    expect(claimStep?.type).toBe("model_performance");
  });

  it("carries the Study's scope and method on the chain", async () => {
    const c = await buildConstellation(APEX, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    const studyStep = c.chains[0].steps.find((s) => s.step === "Study");
    expect(studyStep?.scope).toMatch(/Iberian Bombus/);
    expect(studyStep?.method).toMatch(/main-effects-only/);
  });

  it("returns empty chains[] when there is no Outcome in the constellation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(APEX, {
      depthLimit: 5,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.chains).toEqual([]);
  });
});

// =============================================================================
// ROUND 3 — chain assembly adversarial edge cases
// =============================================================================

describe("buildConstellation — apex-is-Outcome (entry not a CiTO)", () => {
  // User passes an Outcome URI as the entry instead of an apex CiTO. The
  // endpoint must still return a usable chain even though apexCito is null.
  const OUTCOME_AS_ENTRY =
    "https://w3id.org/sciencelive/np/RAoutcomeEntry00000000000000000000000000";
  const STUDY_E = "https://w3id.org/sciencelive/np/RAstudyE000000000000000000000000000000";
  const CLAIM_E = "https://w3id.org/sciencelive/np/RAclaimE000000000000000000000000000000";
  const TPL_OUT = "https://w3id.org/np/RAtplOutE0000000000000000000000000000000";
  const TPL_STU = "https://w3id.org/np/RAtplStuE0000000000000000000000000000000";
  const TPL_CLA = "https://w3id.org/np/RAtplClaE0000000000000000000000000000000";

  it("returns apexCito=null when the entry isn't a CiTO Citation", async () => {
    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${OUTCOME_AS_ENTRY.split("/").pop()}`]: `
@prefix this: <${OUTCOME_AS_ENTRY}> .
sub:assertion {
  <${OUTCOME_AS_ENTRY}> a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Outcome>;
    <https://w3id.org/sciencelive/o/terms/hasValidationStatus> <https://w3id.org/sciencelive/o/terms/Validated>;
    <https://w3id.org/sciencelive/o/terms/isOutcomeOf> <${STUDY_E}> .
  <${STUDY_E}> a <foo> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_OUT}> .
}
`,
      [`https://w3id.org/np/${STUDY_E.split("/").pop()}`]: `
@prefix this: <${STUDY_E}> .
sub:assertion {
  <${STUDY_E}> a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Study>;
    <https://w3id.org/sciencelive/o/terms/targetsClaim> <${CLAIM_E}> .
  <${CLAIM_E}> a <foo> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_STU}> .
}
`,
      [`https://w3id.org/np/${CLAIM_E.split("/").pop()}`]: `
@prefix this: <${CLAIM_E}> .
sub:assertion {
  <${CLAIM_E}> a <https://w3id.org/sciencelive/o/terms/model_performance-FORRT-Claim> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL_CLA}> .
}
`,
      [TPL_OUT]: `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declaring a replication study outcome according to FORRT" . }`,
      [TPL_STU]: `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declaring a replication study design according to FORRT" . }`,
      [TPL_CLA]: `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declaring an original claim according to FORRT" . }`,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        const body = trigMap[u];
        if (body)
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(OUTCOME_AS_ENTRY, {
      depthLimit: 6,
      maxNodes: 80,
      concurrency: 2,
    });
    expect(c.apexCito).toBeNull();
    // The chain should still assemble — Outcome, Study, Claim are reachable.
    expect(c.chains).toHaveLength(1);
    const steps = c.chains[0].steps.map((s) => s.step);
    expect(steps).toContain("Outcome");
    expect(steps).toContain("Study");
    expect(steps).toContain("Claim");
  });
  afterEach(() => vi.unstubAllGlobals());
});

describe("buildConstellation — paper DOI heuristic", () => {
  const APEX =
    "https://w3id.org/sciencelive/np/RAapex00000000000000000000000000000000000";
  const TPL = "https://w3id.org/np/RAtplApex000000000000000000000000000000000";

  function setupWithDois(dois: string[]): void {
    const citoLines = dois
      .map((d) => `    <http://purl.org/spar/cito/cites> <${d}>;`)
      .join("\n");
    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${APEX.split("/").pop()}`]: `
@prefix this: <${APEX}> .
sub:assertion {
  <${APEX}> a <https://schema.org/CreativeWork>;
${citoLines}
    <http://purl.org/spar/cito/qualifies> <${dois[dois.length - 1]}> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`,
      [TPL]: `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declare citations with CiTO" . }`,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        const body = trigMap[u];
        if (body)
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        return new Response("nf", { status: 404 });
      }),
    );
  }
  afterEach(() => vi.unstubAllGlobals());

  it("deprioritises Zenodo DOIs even when they're more frequent than the paper DOI", async () => {
    setupWithDois([
      "https://doi.org/10.5281/zenodo.1",
      "https://doi.org/10.5281/zenodo.2",
      "https://doi.org/10.5281/zenodo.3",
      "https://doi.org/10.1126/science.aax8591",
    ]);
    const c = await buildConstellation(APEX, {
      depthLimit: 2,
      maxNodes: 20,
      concurrency: 2,
    });
    expect(c.paperDoi).toBe("https://doi.org/10.1126/science.aax8591");
  });

  it("picks the most-frequent non-Zenodo DOI when several are present", async () => {
    setupWithDois([
      "https://doi.org/10.1/winner",
      "https://doi.org/10.1/winner",
      "https://doi.org/10.1/winner",
      "https://doi.org/10.1/loser",
    ]);
    const c = await buildConstellation(APEX, {
      depthLimit: 2,
      maxNodes: 20,
      concurrency: 2,
    });
    expect(c.paperDoi).toBe("https://doi.org/10.1/winner");
  });

  it("returns paperDoi='' when the constellation has NO DOIs", async () => {
    const trigMap: Record<string, string> = {
      [`https://w3id.org/np/${APEX.split("/").pop()}`]: `
@prefix this: <${APEX}> .
sub:assertion {
  <${APEX}> a <https://schema.org/CreativeWork> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`,
      [TPL]: `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declare citations with CiTO" . }`,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        const body = trigMap[u];
        if (body)
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/trig" },
          });
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(APEX, {
      depthLimit: 2,
      maxNodes: 20,
      concurrency: 2,
    });
    expect(c.paperDoi).toBe("");
  });

  it("falls back to a Zenodo DOI when there are NO non-Zenodo DOIs", async () => {
    setupWithDois([
      "https://doi.org/10.5281/zenodo.solo",
      "https://doi.org/10.5281/zenodo.solo",
    ]);
    const c = await buildConstellation(APEX, {
      depthLimit: 2,
      maxNodes: 20,
      concurrency: 2,
    });
    expect(c.paperDoi).toBe("https://doi.org/10.5281/zenodo.solo");
  });
});

describe("buildConstellation — pathological cases", () => {
  it("survives templateUri === selfUri (template self-reference)", async () => {
    // A nanopub whose `wasCreatedFromTemplate` points at itself. Should not
    // infinite-loop and should produce some result (likely flat-noded).
    const SELF =
      "https://w3id.org/sciencelive/np/RAself00000000000000000000000000000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (
          u === `https://w3id.org/np/${SELF.split("/").pop()}` ||
          u === SELF
        ) {
          return new Response(
            `
@prefix this: <${SELF}> .
sub:assertion {
  <${SELF}> a <foo> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${SELF}> .
}
`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        }
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(SELF, {
      depthLimit: 3,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.nodeCount).toBeGreaterThanOrEqual(1);
    expect(c.chains).toEqual([]);
  });

  it("survives a Synthesis with no isSupportedBy entries", async () => {
    const SYN =
      "https://w3id.org/sciencelive/np/RAsynLone000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplSynL0000000000000000000000000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${SYN.split("/").pop()}`)
          return new Response(
            `
@prefix this: <${SYN}> .
sub:assertion {
  <${SYN}> a <https://w3id.org/sciencelive/o/terms/Research-Synthesis>;
    <https://w3id.org/sciencelive/o/terms/hasSynthesisDescription> "Lonely synthesis." .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        if (u === TPL)
          return new Response(
            `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Science Live Research Synthesis" . }`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(SYN, {
      depthLimit: 2,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.researchSynthesis).not.toBeNull();
    expect(c.researchSynthesis?.synthesis).toBe("Lonely synthesis.");
    expect(c.chains).toEqual([]); // no Outcome → no chain
  });
});

afterEach(() => vi.unstubAllGlobals());

// =============================================================================
// ROUND 3 — adversarial fixtures (malformed / unfamiliar TriG)
// =============================================================================

describe("buildConstellation — adversarial TriGs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("survives invalid Turtle syntax in a nanopub TriG", async () => {
    const URI =
      "https://w3id.org/sciencelive/np/RAgarbage00000000000000000000000000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${URI.split("/").pop()}`)
          return new Response(
            "complete garbage {{{ not turtle <<<>>> mismatched",
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(URI, {
      depthLimit: 2,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.nodeCount).toBe(1);
    expect(c.chains).toEqual([]);
  });

  it("survives a TriG using unknown prefix declarations", async () => {
    const URI =
      "https://w3id.org/sciencelive/np/RAunknown00000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplUnk00000000000000000000000000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${URI.split("/").pop()}`)
          return new Response(
            `
@prefix wat: <http://example.org/unknown#> .
sub:assertion {
  <${URI}> wat:type wat:Thing;
    wat:hasFoo "some literal foo content here" .
}
sub:pubinfo {
  <${URI}> <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        if (u === TPL)
          return new Response(
            `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Unknown template" . }`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(URI, {
      depthLimit: 2,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.nodeCount).toBe(1);
    const node = c.nodes[0];
    expect(node.stepType).toBe("Unknown template");
    expect(node.stepKind).toBe("other");
    expect(c.chains).toEqual([]);
  });

  it("survives a TriG with extreme nesting of triple-quoted strings", async () => {
    const URI =
      "https://w3id.org/sciencelive/np/RAnestedTriple000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplNest000000000000000000000000000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${URI.split("/").pop()}`)
          return new Response(
            `
@prefix this: <${URI}> .
sub:assertion {
  <${URI}> <https://w3id.org/sciencelive/o/terms/hasConclusionDescription> """Line 1.
Line 2 with "embedded" quote.
Line 3 with .dots. and ;semicolons; that would terminate the segment if not quoted.
End of multi-line literal.""";
    <https://w3id.org/sciencelive/o/terms/hasValidationStatus> <https://w3id.org/sciencelive/o/terms/Validated> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        if (u === TPL)
          return new Response(
            `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "Declaring a replication study outcome according to FORRT" . }`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(URI, {
      depthLimit: 2,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.nodes[0].outcome?.conclusion).toMatch(/Line 1\./);
    expect(c.nodes[0].outcome?.conclusion).toMatch(/End of multi-line literal/);
    expect(c.nodes[0].outcome?.validationStatus).toBe("Validated");
  });

  it("filters out RSA-signature base64 blobs from plainTextExcerpts", async () => {
    const URI =
      "https://w3id.org/sciencelive/np/RAbase64Sig00000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplB64Sig00000000000000000000000000000";
    const sig = "MIICIjANBgkqhkiG9w0BAQEFAA" + "A".repeat(400);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const u = typeof url === "string" ? url : url.toString();
        if (u === SPARQL_URL)
          return new Response(sparqlBindings([]), {
            status: 200,
            headers: { "content-type": "application/sparql-results+json" },
          });
        if (u === `https://w3id.org/np/${URI.split("/").pop()}`)
          return new Response(
            `
@prefix this: <${URI}> .
sub:pubinfo {
  this: <http://purl.org/nanopub/x/hasPublicKey> "${sig}";
    rdfs:label "Real label" .
}
sub:assertion {
  <${URI}> rdfs:label "real human-readable content with spaces" .
}
`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        if (u === TPL)
          return new Response(
            `sub:assertion { sub:assertion a nt:AssertionTemplate; rdfs:label "X" . }`,
            {
              status: 200,
              headers: { "content-type": "application/trig" },
            },
          );
        return new Response("nf", { status: 404 });
      }),
    );
    const c = await buildConstellation(URI, {
      depthLimit: 2,
      maxNodes: 10,
      concurrency: 2,
    });
    expect(c.nodes[0].plainTextExcerpts).not.toContain(sig);
    expect(c.nodes[0].plainTextExcerpts).toContain(
      "real human-readable content with spaces",
    );
  });
});
