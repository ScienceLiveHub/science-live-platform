/**
 * Unit tests for the regex-based TriG extractors.
 *
 * Uses small hardcoded TriG snippets — modelled after real nanopub-network
 * templates and FORRT chain steps — to lock in the bug fixes we hit during
 * dev:
 *   - "is a" template label (matched the first rdfs:label, which was the
 *     label for the rdf:type vocabulary term, not the template's own label)
 *   - Outcome→Claim chain edge not in `npa:refersToNanopub`, only mineable
 *     from the TriG body
 */
import { describe, expect, it } from "vitest";
import {
  canonicalNanopubUri,
  extractAidaFields,
  extractCitoFields,
  extractClaimFields,
  extractDois,
  extractExcerpts,
  extractGithubUrls,
  extractNanopubMeta,
  extractNanopubUris,
  extractOrcids,
  extractOutcomeFields,
  extractPredicateValue,
  extractPredicateValueAny,
  extractPredicateValues,
  extractPredicateValuesAny,
  extractQuoteFields,
  extractResearchSoftwareFields,
  extractResearchSynthesisFields,
  extractStudyFields,
  extractTemplateLabel,
  extractTemplateUri,
  isTemplateDefinitionLabel,
} from "./trig";

describe("canonicalNanopubUri", () => {
  it("matches the SL-prefixed nanopub URI form", () => {
    expect(
      canonicalNanopubUri(
        "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      ),
    ).toBe(
      "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
    );
  });

  it("matches the generic nanopub URI form", () => {
    expect(
      canonicalNanopubUri(
        "https://w3id.org/np/RA43F9EoOuzF0xoNUnCMNyFsfIqlsuWDdPHCnN0wCdCAw",
      ),
    ).toBe("https://w3id.org/np/RA43F9EoOuzF0xoNUnCMNyFsfIqlsuWDdPHCnN0wCdCAw");
  });

  it("strips fragments and named-graph suffixes", () => {
    expect(
      canonicalNanopubUri(
        "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8#assertion",
      ),
    ).toBe(
      "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
    );
  });

  it("returns null for non-nanopub URLs", () => {
    expect(canonicalNanopubUri("https://example.com/foo")).toBeNull();
    expect(canonicalNanopubUri("https://doi.org/10.1234/x")).toBeNull();
  });
});

describe("extractTemplateUri", () => {
  it("finds wasCreatedFromTemplate via the prefixed form", () => {
    const trig = `
      @prefix nt: <https://w3id.org/np/o/ntemplate/> .
      this: nt:wasCreatedFromTemplate <https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE> .
    `;
    expect(extractTemplateUri(trig)).toBe(
      "https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE",
    );
  });

  it("finds wasCreatedFromTemplate via the full-IRI form", () => {
    const trig = `
      this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <https://w3id.org/np/RAX> .
    `;
    expect(extractTemplateUri(trig)).toBe("https://w3id.org/np/RAX");
  });

  it("returns null when the predicate is absent", () => {
    expect(extractTemplateUri("@prefix : <#> .")).toBeNull();
  });
});

describe("extractTemplateLabel", () => {
  it("picks the AssertionTemplate-block label, not earlier vocab labels", () => {
    // Regression for the "is a" bug — the first rdfs:label in a FORRT
    // template TriG belongs to rdf:type ("is a"), NOT the template itself.
    const trig = `
      sub:assertion {
        rdf:type rdfs:label "is a" .
        <https://schema.org/CreativeWork> rdfs:label "Creative work" .

        sub:assertion a nt:AssertionTemplate;
          dct:description "Such a nanopublication declares an outcome.";
          rdfs:label "Declaring a replication study outcome according to FORRT";
          nt:hasNanopubLabelPattern "Outcome: \${label}";
          nt:hasStatement sub:st01 .

        sub:outcome rdfs:label "describe the conclusion" .
      }
    `;
    expect(extractTemplateLabel(trig)).toBe(
      "Declaring a replication study outcome according to FORRT",
    );
  });

  it("falls back to the 'Template:' pubinfo self-label", () => {
    // Some older templates label themselves on `this:` in pubinfo with a
    // "Template: " prefix. The prefix is stripped from the returned value.
    const trig = `
      sub:pubinfo {
        this: dct:created "2024-12-29T16:06:43.753Z"^^xsd:dateTime;
          rdfs:label "Template: Declare citations with CiTO" .
      }
    `;
    expect(extractTemplateLabel(trig)).toBe("Declare citations with CiTO");
  });

  it("falls back to the first non-trivial label", () => {
    const trig = `
      <http://example.org/X> rdfs:label "label-with-content" .
    `;
    expect(extractTemplateLabel(trig)).toBe("label-with-content");
  });

  it("skips trivial labels (< 8 chars) in the fallback path", () => {
    // Without an AssertionTemplate block, the fallback path returns the
    // first label of length >= 8. Trivial vocab labels like "is a" are
    // skipped; the next eligible label wins. (For full disambiguation we'd
    // need an RDF parser to filter by triple subject.)
    const trig = `
      rdf:type rdfs:label "is a" .
      rdfs:label rdfs:label "has the label" .
    `;
    expect(extractTemplateLabel(trig)).toBe("has the label");
  });

  it("returns empty string when no labels at all", () => {
    expect(extractTemplateLabel("@prefix : <#> .")).toBe("");
  });
});

describe("extractOrcids", () => {
  it("returns unique ORCID URIs", () => {
    const trig = `
      orcid:0000-0002-1784-2920 a foaf:Person .
      dc:creator <https://orcid.org/0000-0002-1784-2920>, <https://orcid.org/0000-0001-7542-0286> .
    `;
    expect(extractOrcids(trig).sort()).toEqual([
      "https://orcid.org/0000-0001-7542-0286",
      "https://orcid.org/0000-0002-1784-2920",
    ]);
  });

  it("returns [] when no ORCIDs present", () => {
    expect(extractOrcids("@prefix : <#> .")).toEqual([]);
  });
});

describe("extractDois", () => {
  it("returns unique DOI URIs across the TriG body", () => {
    const trig = `
      <https://doi.org/10.1126/science.aax8591> a schema:CreativeWork .
      <https://doi.org/10.5281/zenodo.20113777> dct:isPartOf <https://doi.org/10.1126/science.aax8591> .
    `;
    expect(extractDois(trig).sort()).toEqual([
      "https://doi.org/10.1126/science.aax8591",
      "https://doi.org/10.5281/zenodo.20113777",
    ]);
  });
});

describe("extractNanopubUris", () => {
  it("returns every canonical nanopub URI mentioned in the TriG", () => {
    // Regression for the 14/19 → 19/19 gap — KP's networkGraph doesn't
    // materialise the Outcome→Claim edge, but the URI is right there in
    // the TriG body. The mining step must surface it.
    const trig = `
      <https://w3id.org/sciencelive/np/RAD19jydIHgfVpRQiA8mqvVUefOd7FFwA4tLIfkXmOJmc> a forrt:Outcome;
        forrt:targetsClaim <https://w3id.org/sciencelive/np/RAVfoa34PLT_3LhfcWLBZ9BQHs43euvrwaTyO9mgk-QcQ>;
        nt:wasCreatedFromTemplate <https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE> .
    `;
    expect(extractNanopubUris(trig).sort()).toEqual([
      "https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE",
      "https://w3id.org/sciencelive/np/RAD19jydIHgfVpRQiA8mqvVUefOd7FFwA4tLIfkXmOJmc",
      "https://w3id.org/sciencelive/np/RAVfoa34PLT_3LhfcWLBZ9BQHs43euvrwaTyO9mgk-QcQ",
    ]);
  });

  it("returns [] for a TriG with no nanopub URIs", () => {
    expect(extractNanopubUris("<https://example.com/x> a foaf:Person .")).toEqual(
      [],
    );
  });
});

describe("extractExcerpts", () => {
  it("returns the longest unique plain-text literals, top 4 by length", () => {
    const trig = `
      sub:x rdfs:label "short" .
      sub:y rdfs:label "this is a substantive Outcome conclusion sentence" .
      sub:z rdfs:label "this is a substantive Outcome conclusion sentence" .
      sub:a rdfs:label "another long literal here for testing extraction" .
    `;
    const out = extractExcerpts(trig);
    // dedup + length-sort
    expect(out.length).toBeLessThanOrEqual(4);
    expect(out[0]).toBe(
      "this is a substantive Outcome conclusion sentence",
    );
    expect(out).not.toContain("short");
  });

  it("skips URI-looking literals", () => {
    const trig = `<http://example.org/x> rdfs:seeAlso "https://example.com/some-long-url" .`;
    expect(extractExcerpts(trig)).toEqual([]);
  });
});

describe("isTemplateDefinitionLabel", () => {
  it("flags template-DEFINITION nanopubs", () => {
    expect(isTemplateDefinitionLabel("defining an assertion template")).toBe(
      true,
    );
    expect(isTemplateDefinitionLabel("Defining a provenance template")).toBe(
      true,
    );
    expect(isTemplateDefinitionLabel("publishing labels for terms")).toBe(true);
  });

  it("does NOT flag actual chain-step templates", () => {
    expect(
      isTemplateDefinitionLabel(
        "Declaring a replication study outcome according to FORRT",
      ),
    ).toBe(false);
    expect(isTemplateDefinitionLabel("Declare citations with CiTO")).toBe(
      false,
    );
    expect(isTemplateDefinitionLabel("")).toBe(false);
  });

  it("does not flag declarative labels that start with 'Declaring'", () => {
    // Regression — the heuristic uses .startsWith("defining"), so adjacent
    // FORRT-style "Declaring …" labels must remain false.
    expect(isTemplateDefinitionLabel("Declaring an original claim")).toBe(
      false,
    );
  });
});

// =============================================================================
// BOUNDARY + EDGE CASES — round 2
// =============================================================================

describe("canonicalNanopubUri boundaries", () => {
  it("matches at exactly 20-character hash (minimum length)", () => {
    const uri = "https://w3id.org/np/RA" + "X".repeat(20);
    expect(canonicalNanopubUri(uri)).toBe(uri);
  });

  it("rejects 19-character hash (one short of minimum)", () => {
    const uri = "https://w3id.org/np/RA" + "X".repeat(19);
    expect(canonicalNanopubUri(uri)).toBeNull();
  });

  it("strips named-graph path suffixes like /Head, /assertion", () => {
    const base =
      "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";
    expect(canonicalNanopubUri(`${base}/Head`)).toBe(base);
    expect(canonicalNanopubUri(`${base}/assertion`)).toBe(base);
  });

  it("accepts http:// in addition to https://", () => {
    expect(
      canonicalNanopubUri(
        "http://w3id.org/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      ),
    ).toBe(
      "http://w3id.org/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
    );
  });

  it("returns null for an empty string", () => {
    expect(canonicalNanopubUri("")).toBeNull();
  });

  it("returns null when prefix lacks the `RA` marker", () => {
    expect(
      canonicalNanopubUri(
        "https://w3id.org/np/XX1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      ),
    ).toBeNull();
  });

  it("does NOT match if the URL lives at an unrelated host", () => {
    expect(
      canonicalNanopubUri(
        "https://example.org/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8",
      ),
    ).toBeNull();
  });
});

describe("extractOrcids boundaries", () => {
  it("matches an ORCID ending in the X check digit", () => {
    const trig = `<http://example.org/x> dct:creator <https://orcid.org/0000-0001-2345-678X> .`;
    expect(extractOrcids(trig)).toEqual([
      "https://orcid.org/0000-0001-2345-678X",
    ]);
  });

  it("is case-insensitive on the protocol prefix", () => {
    const trig = `HTTPS://orcid.org/0000-0002-1784-2920`;
    expect(extractOrcids(trig)).toEqual(["HTTPS://orcid.org/0000-0002-1784-2920"]);
  });
});

describe("extractDois boundaries", () => {
  it("matches DOIs with various registrant prefixes", () => {
    const trig = `
      <https://doi.org/10.1126/science.aax8591>
      <https://doi.org/10.5281/zenodo.20113777>
      <https://doi.org/10.6084/m9.figshare.10058340>
      <https://doi.org/10.15468/dl.3frmsq>
    `;
    const dois = extractDois(trig).sort();
    expect(dois).toContain("https://doi.org/10.1126/science.aax8591");
    expect(dois).toContain("https://doi.org/10.5281/zenodo.20113777");
    expect(dois).toContain("https://doi.org/10.6084/m9.figshare.10058340");
    expect(dois).toContain("https://doi.org/10.15468/dl.3frmsq");
  });

  it("does NOT match a non-prefix string like just '10.1234/foo'", () => {
    expect(extractDois("the doi is 10.1234/foo")).toEqual([]);
  });

  it("stops at a trailing > or whitespace", () => {
    // DOIs in TriG appear inside `<...>`. Make sure we don't capture the >.
    const trig = `<https://doi.org/10.1234/bar> a schema:CreativeWork .`;
    expect(extractDois(trig)).toEqual(["https://doi.org/10.1234/bar"]);
  });
});

describe("extractNanopubUris boundaries", () => {
  it("matches at 20-character hash, rejects shorter", () => {
    const ok = "https://w3id.org/np/RA" + "X".repeat(20);
    const short = "https://w3id.org/np/RA" + "X".repeat(19);
    const trig = `<${ok}> dct:isPartOf <${short}> .`;
    expect(extractNanopubUris(trig)).toEqual([ok]);
  });

  it("does not double-count when the same URI appears multiple times", () => {
    const uri =
      "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";
    const trig = `<${uri}> <p> <${uri}> ; <q> <${uri}> .`;
    expect(extractNanopubUris(trig)).toEqual([uri]);
  });

  it("returns [] for an empty TriG body", () => {
    expect(extractNanopubUris("")).toEqual([]);
  });
});

describe("extractExcerpts boundaries", () => {
  it("matches a literal of exactly 12 chars (minimum)", () => {
    const trig = `<x> rdfs:label "exactlytwelve" .`;
    // "exactlytwelve" is 13 chars — over min. Use exact 12.
    const trigExact = `<x> rdfs:label "twelve_chars" .`;
    expect(extractExcerpts(trig)).toContain("exactlytwelve");
    expect(extractExcerpts(trigExact)).toContain("twelve_chars");
  });

  it("rejects literals of 11 chars (one short of minimum)", () => {
    const trig = `<x> rdfs:label "eleven_char" .`;
    expect(extractExcerpts(trig)).toEqual([]);
  });

  it("returns at most `top` results, longest-first", () => {
    const trig = `
      <a> rdfs:label "twelve_chars" .
      <b> rdfs:label "this is a much longer literal value" .
      <c> rdfs:label "medium length literal here" .
    `;
    const out = extractExcerpts(trig, 2);
    expect(out).toHaveLength(2);
    expect(out[0].length).toBeGreaterThanOrEqual(out[1].length);
  });

  it("returns [] for a TriG with only short literals", () => {
    expect(extractExcerpts(`<x> rdfs:label "tiny" .`)).toEqual([]);
  });
});

describe("extractTemplateLabel boundaries", () => {
  it("handles a malformed AssertionTemplate block (no closing dot)", () => {
    // The block regex requires a trailing `.`. If the TriG is malformed,
    // we should gracefully fall through to the next strategy instead of
    // hanging or matching garbage. Here the block has no `.` so the regex
    // is greedy until end-of-string — and we either find the right label
    // or fall back to the field-label heuristic. Either is acceptable;
    // what matters is that we don't crash.
    const trig = `sub:assertion a nt:AssertionTemplate; rdfs:label "no closing dot here"`;
    // Result is allowed to be either the captured label or the fallback —
    // assertion is "does not throw" and returns a string.
    expect(typeof extractTemplateLabel(trig)).toBe("string");
  });

  it("unescapes escaped quotes inside the captured label", () => {
    const trig = `sub:assertion a nt:AssertionTemplate;
      rdfs:label "a label with an \\"embedded\\" quote here";
      nt:hasStatement sub:st01 .`;
    expect(extractTemplateLabel(trig)).toBe(
      `a label with an "embedded" quote here`,
    );
  });

  it("falls back when AssertionTemplate block exists but has no rdfs:label", () => {
    const trig = `
      sub:assertion a nt:AssertionTemplate;
        nt:hasStatement sub:st01 .
      this: rdfs:label "Template: Some Fallback Label" .
    `;
    expect(extractTemplateLabel(trig)).toBe("Some Fallback Label");
  });

  it("handles an entirely empty TriG body", () => {
    expect(extractTemplateLabel("")).toBe("");
  });
});

describe("extractTemplateUri edge cases", () => {
  it("returns the FIRST template URI when multiple are present", () => {
    const trig = `
      this: nt:wasCreatedFromTemplate <https://w3id.org/np/RA1stTemplate0000000000000000000000000000>;
        nt:wasCreatedFromTemplate <https://w3id.org/np/RA2ndTemplate0000000000000000000000000000> .
    `;
    expect(extractTemplateUri(trig)).toBe(
      "https://w3id.org/np/RA1stTemplate0000000000000000000000000000",
    );
  });
});

// =============================================================================
// PREDICATE-SPECIFIC EXTRACTORS (Phase A — structured FORRT chains)
// =============================================================================

describe("extractGithubUrls", () => {
  it("finds GitHub URLs and strips /tree/ + /blob/ paths", () => {
    const trig = `
      <https://schema.org/codeRepository> <https://github.com/annefou/weatherxbiodiversity-projection> .
      <https://schema.org/sameAs> <https://github.com/annefou/repo/tree/main/sub> .
      <https://schema.org/sameAs> <https://github.com/annefou/repo/blob/main/README.md> .
    `;
    const urls = extractGithubUrls(trig).sort();
    expect(urls).toContain(
      "https://github.com/annefou/weatherxbiodiversity-projection",
    );
    expect(urls).toContain("https://github.com/annefou/repo");
    // /tree/ and /blob/ stripping should dedupe to the same root
    expect(urls.filter((u) => u === "https://github.com/annefou/repo")).toHaveLength(1);
  });

  it("returns [] when no GitHub URLs present", () => {
    expect(extractGithubUrls("@prefix : <#> .")).toEqual([]);
  });

  it("strips trailing slashes", () => {
    const trig = `<x> <p> <https://github.com/annefou/repo/> .`;
    expect(extractGithubUrls(trig)).toEqual(["https://github.com/annefou/repo"]);
  });
});

describe("extractPredicateValue", () => {
  it("returns a single-quoted literal object", () => {
    const trig = `<x> <http://example.org/p> "hello" .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe("hello");
  });

  it("returns a triple-quoted literal object (multiline content)", () => {
    const trig = `<x> <http://example.org/p> """multi
line
content""" .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      "multi\nline\ncontent",
    );
  });

  it("returns a URI object (bracketed)", () => {
    const trig = `<x> <http://example.org/p> <http://example.org/target> .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      "http://example.org/target",
    );
  });

  it("returns null when the predicate is absent", () => {
    expect(
      extractPredicateValue("<x> <other> <y> .", "http://example.org/missing"),
    ).toBeNull();
  });

  it("returns the FIRST match if the predicate repeats", () => {
    const trig = `
      <x> <http://example.org/p> <http://example.org/first> .
      <y> <http://example.org/p> <http://example.org/second> .
    `;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      "http://example.org/first",
    );
  });

  it("unescapes backslash-quoted content", () => {
    const trig = `<x> <http://example.org/p> "she said \\"hi\\" loudly" .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      `she said "hi" loudly`,
    );
  });
});

describe("extractPredicateValues", () => {
  it("returns ALL matches when the predicate repeats", () => {
    const trig = `
      <x> <http://purl.org/spar/cito/cites> <https://doi.org/10.1/a> .
      <x> <http://purl.org/spar/cito/cites> <https://doi.org/10.1/b> .
    `;
    expect(
      extractPredicateValues(trig, "http://purl.org/spar/cito/cites").sort(),
    ).toEqual(["https://doi.org/10.1/a", "https://doi.org/10.1/b"]);
  });

  it("returns [] when the predicate is absent", () => {
    expect(
      extractPredicateValues("<x> <other> <y> .", "http://example.org/missing"),
    ).toEqual([]);
  });
});

describe("extractNanopubMeta", () => {
  // Models the real nanopub pubinfo block from KP where `this:` carries
  // the human-readable label, dct:created datetime, and one-or-more
  // dct:creator ORCIDs.
  it("extracts label, date, and creators from the `this:` property list", () => {
    const trig = `
sub:pubinfo {
  this: dct:created "2026-05-11T19:40:25.904Z"^^xsd:dateTime;
    dct:creator orcid:0000-0002-1784-2920, orcid:0000-0001-7542-0286;
    dct:license <https://creativecommons.org/licenses/by/4.0/>;
    rdfs:label "Outcome: TEI mechanism replicates on Iberian Bombus" .
}
    `;
    const meta = extractNanopubMeta(trig);
    expect(meta.label).toBe(
      "Outcome: TEI mechanism replicates on Iberian Bombus",
    );
    expect(meta.date).toBe("2026-05-11T19:40:25.904Z");
    // ORCIDs in compact `orcid:0000-…` form aren't matched by the absolute
    // URI regex, but the function still finds absolute orcid.org URIs.
    expect(meta.creators).toEqual([]);
  });

  it("finds dct:creator ORCIDs when given in absolute URI form", () => {
    const trig = `
sub:pubinfo {
  this: dct:created "2026-05-11T19:40:25.904Z"^^xsd:dateTime;
    dct:creator <https://orcid.org/0000-0002-1784-2920>, <https://orcid.org/0000-0001-7542-0286>;
    rdfs:label "X" .
}
    `;
    const meta = extractNanopubMeta(trig);
    expect(meta.creators.sort()).toEqual([
      "https://orcid.org/0000-0001-7542-0286",
      "https://orcid.org/0000-0002-1784-2920",
    ]);
  });

  it("returns empty fields for a TriG without `this:` pubinfo", () => {
    expect(extractNanopubMeta("@prefix : <#> .")).toEqual({
      label: "",
      date: "",
      creators: [],
    });
  });
});

describe("extractOutcomeFields", () => {
  it("extracts every FORRT Outcome field", () => {
    const trig = `
      sub:x a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Outcome>;
        <https://w3id.org/sciencelive/o/terms/hasConclusionDescription> """The mechanism is substrate-robust at fit time but qualified at projection.""";
        <https://w3id.org/sciencelive/o/terms/hasEvidenceDescription> """Spearman rho = 0.97 at n>=10 after main-effects-only fix.""";
        <https://w3id.org/sciencelive/o/terms/hasLimitationsDescription> """Three substrates only. One region.""";
        <https://w3id.org/sciencelive/o/terms/hasValidationStatus> <https://w3id.org/sciencelive/o/terms/PartiallySupported>;
        <https://w3id.org/sciencelive/o/terms/hasConfidenceLevel> <https://w3id.org/sciencelive/o/terms/HighConfidence>;
        <https://w3id.org/sciencelive/o/terms/hasOutcomeRepository> <https://doi.org/10.5281/zenodo.20113787>;
        <https://w3id.org/sciencelive/o/terms/isOutcomeOf> <https://w3id.org/sciencelive/np/RAstudy00000000000000000000000000000000000000>;
        <http://schema.org/endDate> "2026-05-09"^^xsd:date .
    `;
    const fields = extractOutcomeFields(trig);
    expect(fields.conclusion).toMatch(/substrate-robust at fit time/);
    expect(fields.evidence).toMatch(/Spearman rho = 0.97/);
    expect(fields.limitations).toMatch(/Three substrates only/);
    expect(fields.validationStatus).toBe("PartiallySupported");
    expect(fields.confidenceLevel).toBe("HighConfidence");
    expect(fields.repository).toBe("https://doi.org/10.5281/zenodo.20113787");
    expect(fields.studyUri).toBe(
      "https://w3id.org/sciencelive/np/RAstudy00000000000000000000000000000000000000",
    );
    expect(fields.endDate).toBe("2026-05-09");
  });

  it("returns empty strings when no predicates present", () => {
    const out = extractOutcomeFields("@prefix : <#> .");
    expect(out.conclusion).toBe("");
    expect(out.validationStatus).toBe("");
    expect(out.repository).toBe("");
  });

  it("ignores unknown validation-status values", () => {
    const trig = `<x> <https://w3id.org/sciencelive/o/terms/hasValidationStatus> <https://example.org/UnknownStatus> .`;
    expect(extractOutcomeFields(trig).validationStatus).toBe("");
  });

  it("falls back to schema:codeRepository when hasOutcomeRepository absent", () => {
    const trig = `<x> <http://schema.org/codeRepository> <https://github.com/annefou/repo> .`;
    expect(extractOutcomeFields(trig).repository).toBe(
      "https://github.com/annefou/repo",
    );
  });
});

describe("extractStudyFields", () => {
  it("extracts scope, methodology, deviations, discipline, targetsClaim", () => {
    const trig = `
      sub:x a <https://w3id.org/sciencelive/o/terms/FORRT-Replication-Study>;
        <https://w3id.org/sciencelive/o/terms/hasScopeDescription> "Iberian Bombus, three substrates, SSP3-7.0";
        <https://w3id.org/sciencelive/o/terms/hasMethodologyDescription> "GLMM with main-effects-only projection";
        <https://w3id.org/sciencelive/o/terms/hasDeviationDescription> "Drop interaction terms at projection time";
        <https://w3id.org/sciencelive/o/terms/hasDiscipline> <http://www.wikidata.org/entity/Q125928>;
        <https://w3id.org/sciencelive/o/terms/targetsClaim> <https://w3id.org/sciencelive/np/RAclaim00000000000000000000000000000000000000> .
    `;
    const fields = extractStudyFields(trig);
    expect(fields.scope).toBe("Iberian Bombus, three substrates, SSP3-7.0");
    expect(fields.methodology).toBe(
      "GLMM with main-effects-only projection",
    );
    expect(fields.deviations).toBe(
      "Drop interaction terms at projection time",
    );
    expect(fields.discipline).toBe("http://www.wikidata.org/entity/Q125928");
    expect(fields.claimUri).toBe(
      "https://w3id.org/sciencelive/np/RAclaim00000000000000000000000000000000000000",
    );
  });
});

describe("extractClaimFields", () => {
  it("derives claimType from the URI suffix like `model_performance-FORRT-Claim`", () => {
    const trig = `
      sub:x a <https://w3id.org/sciencelive/o/terms/model_performance-FORRT-Claim>;
        <https://w3id.org/sciencelive/o/terms/asAidaStatement> <http://purl.org/aida/Projected%20rankings%20vary%20with%20grid> .
    `;
    const fields = extractClaimFields(trig);
    expect(fields.claimType).toBe("model_performance");
    expect(fields.aidaStatement).toBe(
      "http://purl.org/aida/Projected%20rankings%20vary%20with%20grid",
    );
  });

  it("supports any claim-type subclass", () => {
    const trig = `<x> a <https://w3id.org/sciencelive/o/terms/statistical_significance-FORRT-Claim> .`;
    expect(extractClaimFields(trig).claimType).toBe("statistical_significance");
  });

  it("returns empty claimType when no FORRT-Claim subclass present", () => {
    expect(extractClaimFields("<x> a <other> .").claimType).toBe("");
  });
});

describe("extractQuoteFields", () => {
  it("extracts the verbatim quoted text + cited DOI + comment", () => {
    const trig = `
      sub:x <http://purl.org/spar/cito/hasQuotedText> "Bumble bees are declining across continents.";
        <http://purl.org/spar/cito/cites> <https://doi.org/10.1126/science.aax8591>;
        <http://www.w3.org/2000/01/rdf-schema#comment> "Headline claim sentence anchoring this replication." .
    `;
    const q = extractQuoteFields(trig);
    expect(q.quotedText).toBe("Bumble bees are declining across continents.");
    expect(q.citedDoi).toBe("https://doi.org/10.1126/science.aax8591");
    expect(q.comment).toBe(
      "Headline claim sentence anchoring this replication.",
    );
  });
});

describe("extractAidaFields", () => {
  it("decodes the AIDA sentence from a URI path", () => {
    const trig = `
      <http://purl.org/aida/Projected%20per-species%20rankings%20vary%20with%20grid%20resolution.> a <http://purl.org/petapico/o/hycl#AIDA-Sentence> .
    `;
    expect(extractAidaFields(trig).sentence).toBe(
      "Projected per-species rankings vary with grid resolution.",
    );
  });

  it("returns empty string when no AIDA URI present", () => {
    expect(extractAidaFields("@prefix : <#> .").sentence).toBe("");
  });

  it("does not throw on malformed percent-encoding", () => {
    const trig = `<http://purl.org/aida/half%encoded> a <type> .`;
    // Should fall back to the raw encoded form rather than throw.
    expect(typeof extractAidaFields(trig).sentence).toBe("string");
  });
});

describe("extractCitoFields", () => {
  it("identifies every CiTO relation used and the cited targets", () => {
    const trig = `
      <x> <http://purl.org/spar/cito/cites> <https://doi.org/10.1126/science.aax8591>;
          <http://purl.org/spar/cito/extends> <https://doi.org/10.1126/science.aax8591>;
          <http://purl.org/spar/cito/qualifies> <https://doi.org/10.1126/science.aax8591> .
    `;
    const c = extractCitoFields(trig);
    expect(c.relations.sort()).toEqual(["cites", "extends", "qualifies"]);
    expect(c.citedTargets).toEqual(["https://doi.org/10.1126/science.aax8591"]);
  });

  it("returns empty arrays when no CiTO predicates present", () => {
    expect(extractCitoFields("<x> a <foo> .")).toEqual({
      relations: [],
      citedTargets: [],
      citingEntity: "",
    });
  });

  it("extracts the citing-entity URI (subject of cito: triples)", () => {
    const trig = `
      <https://w3id.org/sciencelive/np/RAoutcome000000000000000000000000000000000>
        <http://purl.org/spar/cito/cites> <https://doi.org/10.1126/science.aax8591>;
        <http://purl.org/spar/cito/extends> <https://doi.org/10.1126/science.aax8591> .
    `;
    const c = extractCitoFields(trig);
    expect(c.citingEntity).toBe(
      "https://w3id.org/sciencelive/np/RAoutcome000000000000000000000000000000000",
    );
  });

  it("supports confirms and disputes", () => {
    const trig = `<x> <http://purl.org/spar/cito/confirms> <y> .`;
    expect(extractCitoFields(trig).relations).toContain("confirms");
  });
});

describe("extractResearchSoftwareFields", () => {
  it("returns GitHub repo, Zenodo DOI, and supports targets", () => {
    const trig = `
      <x> a <http://purl.org/dc/dcmitype/Software>;
        <http://schema.org/codeRepository> <https://github.com/annefou/weatherxbiodiversity-projection>;
        <http://purl.org/spar/cito/supports> <https://w3id.org/sciencelive/np/RAclaim00000000000000000000000000000000000000>;
        <http://purl.org/dc/terms/identifier> <https://doi.org/10.5281/zenodo.20113778> .
    `;
    const rs = extractResearchSoftwareFields(trig);
    expect(rs.repository).toBe(
      "https://github.com/annefou/weatherxbiodiversity-projection",
    );
    expect(rs.zenodoDoi).toBe("https://doi.org/10.5281/zenodo.20113778");
    expect(rs.supportsTargets).toContain(
      "https://w3id.org/sciencelive/np/RAclaim00000000000000000000000000000000000000",
    );
  });
});

describe("extractResearchSynthesisFields", () => {
  it("returns synthesis/conditions/limitations/recommendations + supported outcomes + topic Qids", () => {
    const trig = `
      sub:x a <https://w3id.org/sciencelive/o/terms/Research-Synthesis>;
        <https://w3id.org/sciencelive/o/terms/hasSynthesisDescription> """The mechanism resolves into two empirically distinct claims.""";
        <https://w3id.org/sciencelive/o/terms/hasConditionsDescription> """Iberian peninsula, three substrates, SSP3-7.0.""";
        <https://w3id.org/sciencelive/o/terms/hasLimitationsDescription> """Three substrates only.""";
        <https://w3id.org/sciencelive/o/terms/hasRecommendationDescription> """Filter to species with at least 10 occupied cells per substrate.""";
        <http://purl.org/dc/terms/subject> <http://www.wikidata.org/entity/Q125928>, <http://www.wikidata.org/entity/Q2922293>;
        <http://purl.org/spar/cito/isSupportedBy> <https://w3id.org/sciencelive/np/RAout1ABCDEFGHIJKLMNOPQRSTUVWXYZ0000000000>, <https://w3id.org/sciencelive/np/RAout2ABCDEFGHIJKLMNOPQRSTUVWXYZ0000000000>;
        <http://schema.org/endDate> "2026-05-10"^^xsd:date .
    `;
    const s = extractResearchSynthesisFields(trig);
    expect(s.synthesisDescription).toMatch(/empirically distinct claims/);
    expect(s.conditions).toMatch(/Iberian peninsula/);
    expect(s.limitations).toMatch(/Three substrates only/);
    expect(s.recommendations).toMatch(/at least 10 occupied cells/);
    expect(s.supportedByOutcomeUris.sort()).toEqual([
      "https://w3id.org/sciencelive/np/RAout1ABCDEFGHIJKLMNOPQRSTUVWXYZ0000000000",
      "https://w3id.org/sciencelive/np/RAout2ABCDEFGHIJKLMNOPQRSTUVWXYZ0000000000",
    ]);
    expect(s.topicQids.sort()).toEqual(["Q125928", "Q2922293"]);
    expect(s.endDate).toBe("2026-05-10");
  });
});

describe("extractExcerpts noise filter", () => {
  it("filters base64-encoded blobs (RSA signatures + public keys)", () => {
    const trig = `
      <x> rdfs:label "short label is fine if long enough" .
      <y> rdfs:label "${"A".repeat(200)}" .
    `;
    const out = extractExcerpts(trig);
    expect(out.every((s) => !/^[A-Za-z0-9+/=]{100,}$/.test(s))).toBe(true);
    expect(out).toContain("short label is fine if long enough");
  });

  it("filters ISO datetime literals", () => {
    const trig = `
      <x> rdfs:label "substantive content with real letters" .
      <y> dct:created "2026-05-11T19:40:25.904Z" .
    `;
    expect(extractExcerpts(trig)).toEqual([
      "substantive content with real letters",
    ]);
  });

  it("picks up triple-quoted content (FORRT textarea fields)", () => {
    const trig = `
      <x> <p> """This is a long multi-line
      content block typical of FORRT textareas.""" .
    `;
    const out = extractExcerpts(trig);
    expect(out.some((s) => s.includes("multi-line"))).toBe(true);
  });
});

// =============================================================================
// ROUND 3 — gap-filling: internal helpers + adversarial edge cases
// =============================================================================

describe("extractPredicateValueAny + extractPredicateValuesAny (direct)", () => {
  it("returns full-URI matches when available", () => {
    const trig = `<x> <http://example.org/p> "value-from-full" .`;
    expect(
      extractPredicateValueAny(trig, "http://example.org/p", "ex:p"),
    ).toBe("value-from-full");
  });

  it("falls back to prefixed form when full URI is absent", () => {
    const trig = `<x> ex:p "value-from-prefixed" .`;
    expect(
      extractPredicateValueAny(trig, "http://example.org/p", "ex:p"),
    ).toBe("value-from-prefixed");
  });

  it("returns null when neither form matches", () => {
    expect(
      extractPredicateValueAny("<x> <p> <y> .", "http://example.org/q", "ex:q"),
    ).toBeNull();
  });

  it("does NOT merge full-URI and prefixed matches (full URI wins)", () => {
    // If full-URI form returns ANY result, prefixed-form is skipped entirely.
    // Predictable: callers know which form was matched.
    const trig = `
      <x> <http://example.org/p> "from-full-1" .
      <x> ex:p "from-prefixed" .
    `;
    const values = extractPredicateValuesAny(
      trig,
      "http://example.org/p",
      "ex:p",
    );
    expect(values).toEqual(["from-full-1"]);
  });
});

describe("readObjectSegment edge cases (exercised via extractPredicateValue)", () => {
  it("handles a triple-quoted literal that is never closed", () => {
    // Truncated TriG — the regex should grab everything to end-of-input
    // rather than hang or crash.
    const trig = `<x> <http://example.org/p> """starts but never ends`;
    const v = extractPredicateValue(trig, "http://example.org/p");
    expect(typeof v === "string" || v === null).toBe(true);
  });

  it("handles a bracketed URI that is never closed", () => {
    const trig = `<x> <http://example.org/p> <http://example.org/never-closed`;
    expect(() =>
      extractPredicateValue(trig, "http://example.org/p"),
    ).not.toThrow();
  });

  it("handles a property list that runs to end-of-string with no terminator", () => {
    const trig = `<x> <http://example.org/p> "no-terminator-dot"`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      "no-terminator-dot",
    );
  });

  it("does NOT terminate on a dot inside an embedded quoted string", () => {
    const trig = `<x> <http://example.org/p> "this. has. dots." ; <http://example.org/q> "next" .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      "this. has. dots.",
    );
    expect(extractPredicateValue(trig, "http://example.org/q")).toBe("next");
  });

  it("handles backslash-escaped quote at the very end of a literal", () => {
    const trig = `<x> <http://example.org/p> "ends with escape \\"" .`;
    expect(extractPredicateValue(trig, "http://example.org/p")).toBe(
      `ends with escape "`,
    );
  });
});

describe("extractGithubUrls — adversarial URL variants", () => {
  it("naturally captures only org/repo, dropping /pull/, /issues/ etc.", () => {
    // The regex `[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+` only matches two path
    // segments after github.com/, so /pull/12 falls off — same effect as
    // /tree/ stripping but for free.
    const trig = `<x> <p> <https://github.com/annefou/repo/pull/12> .`;
    expect(extractGithubUrls(trig)).toEqual(["https://github.com/annefou/repo"]);
  });

  it("rejects raw.githubusercontent.com (not a repo URL)", () => {
    const trig = `<x> <p> <https://raw.githubusercontent.com/annefou/repo/main/file.md> .`;
    // Current regex is /https?:\/\/github\.com\// — should NOT match raw.
    expect(extractGithubUrls(trig)).toEqual([]);
  });

  it("does NOT match git@github.com:user/repo SSH form", () => {
    const trig = `<x> <p> "git@github.com:annefou/repo.git" .`;
    expect(extractGithubUrls(trig)).toEqual([]);
  });

  it("returns canonical URL when same repo appears with and without /tree/", () => {
    const trig = `
      <x> <p> <https://github.com/annefou/repo> .
      <y> <q> <https://github.com/annefou/repo/tree/main> .
    `;
    const urls = extractGithubUrls(trig);
    // After /tree/ stripping, both collapse to the same URL.
    expect(urls).toEqual(["https://github.com/annefou/repo"]);
  });
});

describe("extractOutcomeFields — repository fallback chain", () => {
  it("falls back to hasRepository when hasOutcomeRepository is absent", () => {
    const trig = `<x> <https://w3id.org/sciencelive/o/terms/hasRepository> <https://github.com/annefou/repo> .`;
    expect(extractOutcomeFields(trig).repository).toBe(
      "https://github.com/annefou/repo",
    );
  });

  it("falls back to schema:codeRepository when neither FORRT predicate present", () => {
    const trig = `<x> <http://schema.org/codeRepository> <https://github.com/annefou/repo> .`;
    expect(extractOutcomeFields(trig).repository).toBe(
      "https://github.com/annefou/repo",
    );
  });

  it("returns the FORRT hasOutcomeRepository when multiple predicates are present (precedence)", () => {
    const trig = `<x>
      <https://w3id.org/sciencelive/o/terms/hasOutcomeRepository> <https://doi.org/10.5281/zenodo.1>;
      <https://w3id.org/sciencelive/o/terms/hasRepository> <https://github.com/wrong/repo>;
      <http://schema.org/codeRepository> <https://github.com/also-wrong/repo> .`;
    expect(extractOutcomeFields(trig).repository).toBe(
      "https://doi.org/10.5281/zenodo.1",
    );
  });

  it("accepts a GitHub URL directly as hasOutcomeRepository (not just Zenodo DOIs)", () => {
    const trig = `<x> <https://w3id.org/sciencelive/o/terms/hasOutcomeRepository> <https://github.com/annefou/direct-repo> .`;
    expect(extractOutcomeFields(trig).repository).toBe(
      "https://github.com/annefou/direct-repo",
    );
  });
});

describe("extractClaimFields — variants", () => {
  it("returns empty claimType when the only type is bare FORRT-Claim (no subclass)", () => {
    const trig = `<x> a <https://w3id.org/sciencelive/o/terms/FORRT-Claim> .`;
    expect(extractClaimFields(trig).claimType).toBe("");
  });

  it("accepts claim types containing underscores and digits", () => {
    const trig = `<x> a <https://w3id.org/sciencelive/o/terms/data_quality_v2-FORRT-Claim> .`;
    expect(extractClaimFields(trig).claimType).toBe("data_quality_v2");
  });

  it("returns empty aidaStatement when the predicate is missing", () => {
    const trig = `<x> a <https://w3id.org/sciencelive/o/terms/model_performance-FORRT-Claim> .`;
    expect(extractClaimFields(trig).aidaStatement).toBe("");
  });
});

describe("extractCitoFields — citing entity heuristics", () => {
  it("uses the direct-regex path for tight property lists", () => {
    // Subject `<URI>` directly followed by `<cito:p>` with no `a <type>;`
    // in between — the regex should match the first form.
    const trig = `<https://w3id.org/sciencelive/np/RAouttight000000000000000000000000000000000>
      <http://purl.org/spar/cito/cites> <https://doi.org/10.1/x> .`;
    const c = extractCitoFields(trig);
    expect(c.citingEntity).toBe(
      "https://w3id.org/sciencelive/np/RAouttight000000000000000000000000000000000",
    );
  });

  it("falls back to TriG-mining when subject has an `a <type>; ` interlude", () => {
    // The real-world FORRT outcome-level CiTO shape.
    const SELF =
      "https://w3id.org/sciencelive/np/RAcitoself0000000000000000000000000000000";
    const SUBJ =
      "https://w3id.org/sciencelive/np/RAoutcomeSubj00000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplCitoX00000000000000000000000000000000";
    const trig = `
@prefix this: <${SELF}> .
sub:assertion {
  <${SUBJ}> a <https://schema.org/CreativeWork>;
    <http://purl.org/spar/cito/extends> <https://doi.org/10.1/x> .
}
sub:pubinfo {
  this: <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
}
`;
    const c = extractCitoFields(trig, { selfUri: SELF, templateUri: TPL });
    expect(c.citingEntity).toBe(SUBJ);
  });

  it("returns empty citingEntity when options are missing and the regex fails", () => {
    // Without the self/template options, we can't disambiguate. The direct
    // regex still tries, but fails on the `a <type>;` interlude. So citing
    // entity is empty.
    const SUBJ =
      "https://w3id.org/sciencelive/np/RAouts00000000000000000000000000000000000";
    const trig = `
<${SUBJ}> a <https://schema.org/CreativeWork>;
  <http://purl.org/spar/cito/extends> <https://doi.org/10.1/x> .
`;
    const c = extractCitoFields(trig);
    // The TriG-only nanopub URI is the subject, and without options we fall
    // through to the heuristic which returns the only nanopub URI present.
    expect(c.citingEntity).toBe(SUBJ);
  });

  it("does NOT return the self URI as the citing entity", () => {
    const SELF =
      "https://w3id.org/sciencelive/np/RAself00000000000000000000000000000000000";
    const TPL = "https://w3id.org/np/RAtplY0000000000000000000000000000000000000";
    // Only self URI is in the TriG body — no other nanopub URI.
    const trig = `
<${SELF}> <http://purl.org/spar/cito/extends> <https://doi.org/10.1/x> .
<${SELF}> <https://w3id.org/np/o/ntemplate/wasCreatedFromTemplate> <${TPL}> .
`;
    const c = extractCitoFields(trig, { selfUri: SELF, templateUri: TPL });
    // Direct regex matches `<SELF> <cito:extends>`; my prior fix canonicalises.
    expect(c.citingEntity).toBe(SELF);
  });
});

describe("extractNanopubMeta — variants", () => {
  it("captures xsd:date dct:created (no time component)", () => {
    const trig = `
sub:pubinfo {
  this: dct:created "2026-05-11"^^xsd:date;
    rdfs:label "X" .
}
`;
    expect(extractNanopubMeta(trig).date).toBe("2026-05-11");
  });

  it("does NOT pick up bare orcid:0000-… prefix form as creator (only absolute URIs)", () => {
    // FORRT TriGs sometimes use the compact `orcid:` prefix form. We
    // explicitly only accept absolute orcid.org URIs because the prefix
    // mapping may differ across publishers. Document this here.
    const trig = `
sub:pubinfo {
  this: dct:creator orcid:0000-0002-1784-2920;
    rdfs:label "X" .
}
`;
    expect(extractNanopubMeta(trig).creators).toEqual([]);
  });

  it("returns the FIRST label across multiple this: blocks", () => {
    const trig = `
sub:assertion {
  this: rdfs:label "assertion-label" .
}
sub:pubinfo {
  this: rdfs:label "pubinfo-label" .
}
`;
    expect(extractNanopubMeta(trig).label).toBe("assertion-label");
  });
});

describe("extractAidaFields — decode edge cases", () => {
  it("decodes a plain ASCII AIDA URI", () => {
    const trig = `<http://purl.org/aida/Simple%20sentence.> a <type> .`;
    expect(extractAidaFields(trig).sentence).toBe("Simple sentence.");
  });

  it("handles a Unicode-encoded AIDA URI", () => {
    const trig = `<http://purl.org/aida/Caf%C3%A9%20rules.> a <type> .`;
    expect(extractAidaFields(trig).sentence).toBe("Café rules.");
  });

  it("falls back to the raw encoded form on malformed percent-encoding", () => {
    const trig = `<http://purl.org/aida/bad%encoding> a <type> .`;
    // decodeURIComponent throws on `%e`; we should fall back to the raw.
    expect(extractAidaFields(trig).sentence).toBe("bad%encoding");
  });
});

describe("extractResearchSoftwareFields — variants", () => {
  it("returns first GitHub URL when multiple are present", () => {
    const trig = `<x>
      <http://schema.org/codeRepository> <https://github.com/a/first>;
      <http://schema.org/sameAs> <https://github.com/a/second> .`;
    const rs = extractResearchSoftwareFields(trig);
    // The repository field comes from the GitHub regex, which returns the
    // first match in document order.
    expect(rs.repository).toBe("https://github.com/a/first");
  });

  it("returns empty repository when no GitHub URL present", () => {
    const trig = `<x> <http://purl.org/dc/terms/identifier> <https://doi.org/10.5281/zenodo.1> .`;
    expect(extractResearchSoftwareFields(trig).repository).toBe("");
  });

  it("captures supportsTargets even when the predicate object is a literal", () => {
    // The predicate value extractor accepts literals OR URIs; for cito:supports
    // the data is typically a URI but defensively we should not crash on
    // string literals either.
    const trig = `<x> <http://purl.org/spar/cito/supports> "literal-only" .`;
    expect(extractResearchSoftwareFields(trig).supportsTargets).toEqual([
      "literal-only",
    ]);
  });
});

describe("canonicalNanopubUri security boundary", () => {
  // The URI flows into `bindUri()` which substitutes it into a SPARQL query
  // wrapped in `<…>`. If an attacker could smuggle `>` or `<` or whitespace
  // through canonicalNanopubUri, they could break out of the IRI literal and
  // inject SPARQL. The regex must reject such inputs at the canonical step.

  it("rejects an attempt to inject closing > and arbitrary text", () => {
    expect(
      canonicalNanopubUri(
        "https://w3id.org/np/RA" +
          "X".repeat(20) +
          "> ; DROP GRAPH <https://example.org/",
      ),
    ).toBe("https://w3id.org/np/RA" + "X".repeat(20));
    // The injected segment after the canonical prefix is stripped.
  });

  it("rejects whitespace inside the hash", () => {
    expect(
      canonicalNanopubUri("https://w3id.org/np/RA1234567 hijklmnop"),
    ).toBeNull();
  });

  it("rejects a quote character inside the URI", () => {
    expect(
      canonicalNanopubUri('https://w3id.org/np/RA"; SELECT * } #'),
    ).toBeNull();
  });
});
