import {
  bindUri,
  NANOPUB_SPARQL_ENDPOINT_FULL,
  REFERENCES_FROM,
  REFERENCES_TO,
} from "./queries";
import { executeSparql, fetchTrig } from "./sparql";
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
  extractQuoteFields,
  extractResearchSoftwareFields,
  extractResearchSynthesisFields,
  extractStudyFields,
  extractTemplateLabel,
  isTemplateDefinitionLabel,
  type AidaFields,
  type CitoFields,
  type ClaimFields,
  type OutcomeFields,
  type QuoteFields,
  type ResearchSoftwareFields,
  type ResearchSynthesisFields,
  type StudyFields,
} from "./trig";

/**
 * Categorical kind of each chain step, inferred from the template label.
 * "other" covers template-definition nanopubs and anything we don't yet
 * recognise (we still include them in `nodes[]` for debugging).
 */
export type StepKind =
  | "quote"
  | "aida"
  | "claim"
  | "study"
  | "outcome"
  | "cito"
  | "research-software"
  | "research-synthesis"
  | "other";

export type ConstellationNode = {
  uri: string;
  stepKind: StepKind;
  stepType: string;
  templateUri: string;
  label: string;
  date: string;
  creators: string[];
  authorsOrcid: string[];
  plainTextExcerpts: string[];
  // Per-template structured fields — only the matching one is populated.
  outcome?: OutcomeFields;
  study?: StudyFields;
  claim?: ClaimFields;
  quote?: QuoteFields;
  aida?: AidaFields;
  cito?: CitoFields;
  researchSoftware?: ResearchSoftwareFields;
  researchSynthesis?: ResearchSynthesisFields;
  /** Every GitHub URL found in this nanopub's TriG. */
  githubUrls: string[];
};

export type ConstellationEdge = {
  source: string;
  target: string;
  relation: "refersTo";
};

export type ChainStep = {
  step:
    | "Quote"
    | "AIDA"
    | "Claim"
    | "Study"
    | "Outcome"
    | "CiTO"
    | "ResearchSoftware";
  uri: string;
  label?: string;
  text?: string;
  type?: string;
  scope?: string;
  method?: string;
  deviations?: string;
  verdict?: string;
  confidence?: string;
  conclusion?: string;
  evidence?: string;
  limitations?: string;
  repository?: string;
  zenodoDoi?: string;
  relations?: string[];
  targets?: string[];
};

export type Chain = {
  id: string;
  outcomeUri: string;
  outcomeVerdict: string;
  outcomeConfidence: string;
  citoRelations: string[];
  steps: ChainStep[];
};

export type ApexCito = {
  uri: string;
  relations: string[];
  citedTargets: string[];
};

export type ResearchSynthesisSummary = {
  uri: string;
  label: string;
  synthesis: string;
  conditions: string;
  limitations: string;
  recommendations: string;
};

export type Constellation = {
  entry: string;
  /** The primary cited paper DOI shared across the chain, if discoverable. */
  paperDoi: string;
  /** Top-level CiTO Citation nanopub at the apex of the constellation. */
  apexCito: ApexCito | null;
  /** Top-level Research Synthesis nanopub, if one is present. */
  researchSynthesis: ResearchSynthesisSummary | null;
  /** One chain per FORRT Outcome — Quote → AIDA → Claim → Study → Outcome
   *  → CiTO + ResearchSoftware. */
  chains: Chain[];
  // Backwards-compatible flat fields — useful for debugging and for clients
  // that want raw graph data.
  nodeCount: number;
  edgeCount: number;
  sparqlEndpoint: string;
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  externalCitations: string[];
};

type TraversalOptions = {
  depthLimit: number;
  maxNodes: number;
  /** Max concurrent processNode() calls per BFS level. KP rate-limits ~503
   *  under heavier fan-out; 2 is a safe default that finishes a 19-node
   *  chain in ~15-20s. */
  concurrency: number;
  signal?: AbortSignal;
};

const DEFAULT_OPTIONS: TraversalOptions = {
  depthLimit: 5,
  maxNodes: 80,
  concurrency: 2,
};

/**
 * BFS the citation graph from `entryUri` using bidirectional SPARQL discovery
 * (incoming + outgoing references) and per-nanopub TriG fetching for content
 * extraction. Mirrors the Python `import-nanopub-chain.py walk()` function.
 */
export async function buildConstellation(
  entryUri: string,
  optsIn: Partial<TraversalOptions> = {},
): Promise<Constellation> {
  const opts = { ...DEFAULT_OPTIONS, ...optsIn };
  const { depthLimit, maxNodes, concurrency, signal } = opts;

  const templateLabelCache = new Map<string, string>();
  const nodes = new Map<string, ConstellationNode>();
  const edges: ConstellationEdge[] = [];
  const externals = new Set<string>();
  const visited = new Set<string>();

  let frontier: { uri: string; depth: number }[] = [
    { uri: entryUri, depth: 0 },
  ];

  while (frontier.length > 0 && nodes.size < maxNodes) {
    const level = frontier;
    frontier = [];
    const toProcess = level.filter((n) => !visited.has(n.uri));
    for (const n of toProcess) visited.add(n.uri);
    if (toProcess.length === 0) continue;

    const results = await runWithConcurrency(toProcess, concurrency, (n) =>
      processNode(n, templateLabelCache, signal),
    );

    for (const r of results) {
      if (!r) continue;
      nodes.set(r.node.uri, r.node);
      for (const d of r.dois) externals.add(d);

      if (isTemplateDefinitionLabel(r.node.stepType)) continue;
      if (r.depth >= depthLimit) continue;

      for (const neighbour of r.neighbours) {
        if (neighbour === r.node.templateUri) continue;
        edges.push({
          source: r.node.uri,
          target: neighbour,
          relation: "refersTo",
        });
        if (!visited.has(neighbour) && nodes.size < maxNodes) {
          frontier.push({ uri: neighbour, depth: r.depth + 1 });
        }
      }
    }
  }

  const nodeList = [...nodes.values()];
  const { chains, apexCito, researchSynthesis, paperDoi } = assembleChains(
    nodeList,
    entryUri,
  );

  return {
    entry: entryUri,
    paperDoi,
    apexCito,
    researchSynthesis,
    chains,
    nodeCount: nodes.size,
    edgeCount: edges.length,
    sparqlEndpoint: NANOPUB_SPARQL_ENDPOINT_FULL,
    nodes: nodeList,
    edges,
    externalCitations: [...externals].sort(),
  };
}

// =============================================================================
// Per-node processing
// =============================================================================

type ProcessedNode = {
  depth: number;
  node: ConstellationNode;
  neighbours: string[];
  dois: string[];
};

async function processNode(
  { uri, depth }: { uri: string; depth: number },
  templateLabelCache: Map<string, string>,
  signal?: AbortSignal,
): Promise<ProcessedNode | null> {
  let trig: string;
  try {
    trig = await fetchTrig(uri, signal);
  } catch {
    return null;
  }

  const templateUri = extractTemplateUriFromTrig(trig);
  const stepType = templateUri
    ? await resolveTemplateLabel(templateUri, templateLabelCache, signal)
    : "";

  const stepKind = classifyStepKind(stepType);
  const meta = extractNanopubMeta(trig);

  const node: ConstellationNode = {
    uri,
    stepKind,
    stepType,
    templateUri: templateUri ?? "",
    label: meta.label,
    date: meta.date,
    creators: meta.creators,
    authorsOrcid: extractOrcids(trig),
    plainTextExcerpts: extractExcerpts(trig),
    githubUrls: extractGithubUrls(trig),
  };

  // Attach the per-template structured fields. We always attach when the
  // step kind matches, even if the extraction returned mostly empty fields —
  // that's the contract for callers checking which kind a node is.
  switch (stepKind) {
    case "outcome":
      node.outcome = extractOutcomeFields(trig);
      break;
    case "study":
      node.study = extractStudyFields(trig);
      break;
    case "claim":
      node.claim = extractClaimFields(trig);
      break;
    case "quote":
      node.quote = extractQuoteFields(trig);
      break;
    case "aida":
      node.aida = extractAidaFields(trig);
      break;
    case "cito":
      node.cito = extractCitoFields(trig, {
        selfUri: uri,
        templateUri: templateUri ?? "",
      });
      break;
    case "research-software":
      node.researchSoftware = extractResearchSoftwareFields(trig);
      break;
    case "research-synthesis":
      node.researchSynthesis = extractResearchSynthesisFields(trig);
      break;
  }

  let sparqlNeighbours: string[] = [];
  try {
    sparqlNeighbours = await discoverNeighbours(uri, signal);
  } catch {
    sparqlNeighbours = [];
  }

  const merged = new Set<string>(sparqlNeighbours);
  for (const u of extractNanopubUris(trig)) {
    if (u !== uri) merged.add(u);
  }
  const neighbours = [...merged];

  return { depth, node, neighbours, dois: extractDois(trig) };
}

async function discoverNeighbours(
  uri: string,
  signal?: AbortSignal,
): Promise<string[]> {
  // Serialise the two SPARQL hits — KP's nginx returns intermittent 503s
  // under concurrent load, and the executeSparql retry helper handles
  // transient failures but doesn't reduce parallel pressure.
  const incoming = await executeSparql(bindUri(REFERENCES_TO, uri), signal);
  const outgoing = await executeSparql(bindUri(REFERENCES_FROM, uri), signal);
  const out = new Set<string>();
  for (const row of [...incoming, ...outgoing]) {
    const canon = canonicalNanopubUri(row.np ?? "");
    if (canon && canon !== uri) out.add(canon);
  }
  return [...out];
}

async function resolveTemplateLabel(
  templateUri: string,
  cache: Map<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const cached = cache.get(templateUri);
  if (cached !== undefined) return cached;
  try {
    const trig = await fetchTrig(templateUri, signal);
    const label = extractTemplateLabel(trig);
    cache.set(templateUri, label);
    return label;
  } catch {
    cache.set(templateUri, "");
    return "";
  }
}

function extractTemplateUriFromTrig(trig: string): string | null {
  const m =
    /(?:nt:wasCreatedFromTemplate|<https:\/\/w3id\.org\/np\/o\/ntemplate\/wasCreatedFromTemplate>)\s+<([^>]+)>/.exec(
      trig,
    );
  return m ? m[1] : null;
}

// =============================================================================
// Step-kind classification
// =============================================================================

export function classifyStepKind(stepType: string): StepKind {
  const s = stepType.toLowerCase();
  if (s.includes("research synthesis")) return "research-synthesis";
  if (s.includes("research software")) return "research-software";
  if (s.includes("replication study outcome")) return "outcome";
  if (s.includes("replication study design")) return "study";
  if (s.includes("original claim")) return "claim";
  if (s.includes("paper quotation")) return "quote";
  if (s.includes("aida sentence")) return "aida";
  if (s.includes("citations with cito") || s.includes("cito citation"))
    return "cito";
  return "other";
}

// =============================================================================
// Chain assembly
// =============================================================================

type AssemblyResult = {
  chains: Chain[];
  apexCito: ApexCito | null;
  researchSynthesis: ResearchSynthesisSummary | null;
  paperDoi: string;
};

function assembleChains(
  nodes: ConstellationNode[],
  entryUri: string,
): AssemblyResult {
  const byUri = new Map(nodes.map((n) => [n.uri, n]));
  const byKind = new Map<StepKind, ConstellationNode[]>();
  for (const n of nodes) {
    const list = byKind.get(n.stepKind) ?? [];
    list.push(n);
    byKind.set(n.stepKind, list);
  }

  // Apex CiTO — the entry-URI node if it's a CiTO, otherwise the first CiTO
  // whose cited targets include the paper DOI we'll discover next.
  const entryNode = byUri.get(entryUri);
  let apexCito: ApexCito | null = null;
  if (entryNode && entryNode.stepKind === "cito" && entryNode.cito) {
    apexCito = {
      uri: entryNode.uri,
      relations: entryNode.cito.relations,
      citedTargets: entryNode.cito.citedTargets,
    };
  }

  // Research Synthesis — the first node of that kind. Synthesis is unique
  // at the apex of a multi-chain constellation; if there are multiple, the
  // first one is used.
  const synthesisNode = (byKind.get("research-synthesis") ?? [])[0];
  const researchSynthesis: ResearchSynthesisSummary | null =
    synthesisNode && synthesisNode.researchSynthesis
      ? {
          uri: synthesisNode.uri,
          label: synthesisNode.label,
          synthesis: synthesisNode.researchSynthesis.synthesisDescription,
          conditions: synthesisNode.researchSynthesis.conditions,
          limitations: synthesisNode.researchSynthesis.limitations,
          recommendations: synthesisNode.researchSynthesis.recommendations,
        }
      : null;

  // Paper DOI — the most common DOI cited across the constellation's CiTO
  // and Quote nodes, biased toward those that aren't Zenodo (artefact DOIs).
  const paperDoi = findPrimaryPaperDoi(nodes);

  // Build a chain per Outcome.
  const outcomes = byKind.get("outcome") ?? [];
  const claims = byKind.get("claim") ?? [];
  const studies = byKind.get("study") ?? [];
  const quotes = byKind.get("quote") ?? [];
  const aidas = byKind.get("aida") ?? [];
  const citos = byKind.get("cito") ?? [];
  const researchSoftwares = byKind.get("research-software") ?? [];

  const chains: Chain[] = [];
  for (const outcome of outcomes) {
    const out = outcome.outcome;
    if (!out) continue;

    // Study via explicit isOutcomeOf. The predicate value sometimes carries
    // a trailing assertion-subject path like `…/soroye-tei-mechanism`; we
    // canonicalise to the bare nanopub URI before the lookup.
    const studyUri = canonicalNanopubUri(out.studyUri) ?? out.studyUri;
    const study = byUri.get(studyUri) ?? findRelated(outcome, studies);
    const claimUri = study?.study?.claimUri
      ? (canonicalNanopubUri(study.study.claimUri) ?? study.study.claimUri)
      : "";
    const claim = byUri.get(claimUri) ?? findRelated(outcome, claims);

    // AIDA via the aida URI the Claim references — match the AIDA node
    // whose decoded sentence equals the Claim's aidaStatement decoded.
    const aida = findAidaForClaim(claim, aidas) ?? findRelated(outcome, aidas);

    // Quote — find the Quote node that the AIDA or Claim references.
    const quote =
      findQuoteForAida(aida, quotes) ?? findRelated(outcome, quotes);

    // CiTO node whose citing entity (subject) is THIS outcome. This is the
    // outcome-level CiTO citation that connects the Outcome to the upstream
    // paper DOI and any artefact DOIs.
    const cito = citos.find(
      (c) => c.cito?.citingEntity === outcome.uri && c.uri !== entryUri,
    );

    // Research Software node that supports this Outcome (or any of its
    // upstream Claim/Study).
    const rs = researchSoftwares.find((r) =>
      r.researchSoftware?.supportsTargets.some((t) => {
        const canon = canonicalNanopubUri(t);
        return (
          canon === outcome.uri ||
          (claim && canon === claim.uri) ||
          (study && canon === study.uri)
        );
      }),
    );

    const steps: ChainStep[] = [];
    if (quote && quote.quote)
      steps.push({
        step: "Quote",
        uri: quote.uri,
        text: quote.quote.quotedText,
        targets: quote.quote.citedDoi ? [quote.quote.citedDoi] : [],
      });
    if (aida && aida.aida)
      steps.push({ step: "AIDA", uri: aida.uri, text: aida.aida.sentence });
    if (claim && claim.claim)
      steps.push({
        step: "Claim",
        uri: claim.uri,
        type: claim.claim.claimType,
        label: claim.label,
      });
    if (study && study.study)
      steps.push({
        step: "Study",
        uri: study.uri,
        scope: study.study.scope,
        method: study.study.methodology,
        deviations: study.study.deviations,
      });
    steps.push({
      step: "Outcome",
      uri: outcome.uri,
      label: outcome.label,
      verdict: out.validationStatus,
      confidence: out.confidenceLevel,
      conclusion: out.conclusion,
      evidence: out.evidence,
      limitations: out.limitations,
      repository: out.repository,
    });
    if (cito && cito.cito)
      steps.push({
        step: "CiTO",
        uri: cito.uri,
        relations: cito.cito.relations,
        targets: cito.cito.citedTargets,
      });
    if (rs && rs.researchSoftware)
      steps.push({
        step: "ResearchSoftware",
        uri: rs.uri,
        label: rs.label,
        repository: rs.researchSoftware.repository,
        zenodoDoi: rs.researchSoftware.zenodoDoi,
      });

    chains.push({
      id: outcome.uri.split("/").pop() ?? outcome.uri,
      outcomeUri: outcome.uri,
      outcomeVerdict: out.validationStatus,
      outcomeConfidence: out.confidenceLevel,
      citoRelations: cito?.cito?.relations ?? [],
      steps,
    });
  }

  return { chains, apexCito, researchSynthesis, paperDoi };
}

/**
 * Pick the most likely primary paper DOI from the constellation's external
 * citations. Heuristic: the DOI cited the most often across CiTO + Quote
 * nodes, with Zenodo artefact DOIs deprioritised.
 */
function findPrimaryPaperDoi(nodes: ConstellationNode[]): string {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const dois: string[] = [];
    if (n.cito) dois.push(...n.cito.citedTargets);
    if (n.quote?.citedDoi) dois.push(n.quote.citedDoi);
    for (const d of dois) {
      if (!d.startsWith("https://doi.org/") && !d.startsWith("http://doi.org/"))
        continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => {
    const aArtefact = /10\.5281\/zenodo/.test(a[0]) ? 1 : 0;
    const bArtefact = /10\.5281\/zenodo/.test(b[0]) ? 1 : 0;
    if (aArtefact !== bArtefact) return aArtefact - bArtefact;
    return b[1] - a[1];
  });
  return sorted[0]?.[0] ?? "";
}

/**
 * For a chain-step node (typically an Outcome), pick the most plausible
 * related node of the given kind. Falls back to "the only node of that
 * kind in the constellation" if there's just one; otherwise returns null.
 * This is the conservative path when explicit predicate-linkage failed.
 */
function findRelated(
  _from: ConstellationNode,
  candidates: ConstellationNode[],
): ConstellationNode | undefined {
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

function findAidaForClaim(
  claim: ConstellationNode | undefined,
  aidas: ConstellationNode[],
): ConstellationNode | undefined {
  if (!claim?.claim?.aidaStatement) return undefined;
  const target = claim.claim.aidaStatement;
  for (const a of aidas) {
    // The AIDA URI lives in the AIDA nanopub's TriG; we approximated by
    // storing the decoded sentence in `aida.sentence`. Compare URL-decoded
    // forms of the target's path against the AIDA's sentence.
    if (a.uri.includes(target)) return a;
    try {
      const decoded = decodeURIComponent(
        target.replace(/^http:\/\/purl\.org\/aida\//, ""),
      );
      if (a.aida?.sentence && a.aida.sentence === decoded) return a;
    } catch {
      // fall through
    }
  }
  return undefined;
}

function findQuoteForAida(
  aida: ConstellationNode | undefined,
  quotes: ConstellationNode[],
): ConstellationNode | undefined {
  if (!aida) return quotes.length === 1 ? quotes[0] : undefined;
  // No explicit predicate for AIDA→Quote in FORRT. The AIDA's TriG usually
  // mentions the Quote nanopub URI. We don't have the raw TriG here, but
  // the AIDA's plainTextExcerpts won't help — instead fall back to "only
  // Quote in the constellation" when there's exactly one.
  if (quotes.length === 1) return quotes[0];
  return undefined;
}

/**
 * Run an async worker over `items` with bounded `limit` concurrency. Order
 * of results matches input order. Returns null in positions where the worker
 * returned null/undefined.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R | null>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, Math.min(limit, items.length)); i++) {
    runners.push(
      (async () => {
        while (true) {
          const idx = next++;
          if (idx >= items.length) return;
          results[idx] = await worker(items[idx]);
        }
      })(),
    );
  }
  await Promise.all(runners);
  return results;
}
