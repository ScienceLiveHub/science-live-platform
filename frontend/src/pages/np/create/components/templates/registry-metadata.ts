/**
 * Template metadata shared across all workspaces
 * This file contains no React imports and can be safely imported by non-React workspaces
 */

export interface NanopubTemplateMetadata {
  name: string;
  description: string;
  moreDescription?: string;
  category: string;
  icon: string;
  color?: string;
  recommended?: boolean;
  keywords?: string[];
}

/** Nanopub URI of each known template (current/latest version used for creation or utility) */
export const TEMPLATE_URI = {
  // Core templates
  CITATION_CITO:
    "https://w3id.org/np/RA43F9EoOuzF0xoNUnCMNyFsfIqlsuWDdPHCnN0wCdCAw",
  ANNOTATE_QUOTATION:
    "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU",
  COMMENT_PAPER:
    "http://purl.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI",
  AIDA_SENTENCE:
    "https://w3id.org/np/RALmXhDw3rHcMveTgbv8VtWxijUHwnSqhCmtJFIPKWVaA",
  GEO_COVERAGE:
    "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao",

  // Data & Software
  DATASET: "https://w3id.org/np/RAuVB37yyAuAlgusrUAoG84JI4_EfrEqIkpEZYDpSz3d8",
  RESEARCH_SOFTWARE:
    "https://w3id.org/np/RABBzVTxosLGT4YBCfdfNd6LyuOOTe2EVOTtWJMyOoZHk",
  ODRL_POLICY:
    "https://w3id.org/np/RA61D4c7dB5t0B1mLhc78bN2vagqYTXQiJDKY0yImRULI",
  ODRL_ACCESS_GRANT:
    "https://w3id.org/np/RAoLSOhZx_dLX6xnGBN8o1aQSiD8HSrwBshfCjXXSslhE",

  // PRISMA Systematic Review
  PICO_RESEARCH_QUESTION:
    "https://w3id.org/np/RA5e5XeXy_-aNK5giB7kBAEQslTLVydHeM4YYEzhmEE2w",
  PCC_RESEARCH_QUESTION:
    "https://w3id.org/np/RAmR-xqMgOq3oTJmOVDQFL2p5usID6zqRapizHy0UJb04",
  PRISMA_SEARCH_STRATEGY:
    "https://w3id.org/np/RAvcJKm2DZPEKOBevGdPGcKL6sEw04JXwgzx2lH5DE5LU",
  PRISMA_DATABASE_SEARCH:
    "https://w3id.org/np/RA8MyCoRqMdgGqqOwN4MIQfe6Htwt5FPgiHXlXK4RKiic",
  PRISMA_SEARCH_EXECUTION_DATASET:
    "https://w3id.org/np/RAV_H3udaSzxYOhhR0t-q7PKS6URwauD_Z5sMLbHmM2x0",
  PRISMA_STUDY_INCLUSION:
    "https://w3id.org/np/RAivw_N13pxVoXRMP6Y3ErfA--Z011qMqwKccfiKVxF0w",
  PRISMA_STUDY_ASSESSMENT:
    "https://w3id.org/np/RAwQj3SNiopwPrHXfoRT2JtYZSt-5JsDHjBDW6nYz_rDE",
  PRISMA_FULL_SCREENING:
    "https://w3id.org/np/RAh4iIKHSi30apMADmsYrdyeTd1hvvYZaRRfsKLZX1jsw",

  // FORRT Replication
  FORRT_CLAIM:
    "https://w3id.org/np/RAZWyM8D16ya3S1zhCvrG1f0iSpd9-8onVWp0FTvvX7LQ",
  FORRT_KL_REPLICATION:
    "https://w3id.org/np/RALIq4JelUP-q9BuWONcKMJ87B5n59ppcwhQjl-1dheO4",
  FORRT_KL_REPLICATION_OUTCOME:
    "https://w3id.org/np/RAw3XdUhxQJfKBaU-cQhV6c7au4rLd5CSUdbMKTS_FB8g",
  FORRT_REPLICATION:
    "https://w3id.org/np/RAuLEjPp-4dTvPwMkfHggTto1CgjIftiGRAgHlyeEonjQ",
  FORRT_REPLICATION_OUTCOME:
    "https://w3id.org/np/RA2zljn0Nw9SadppOyxZoh-_Rxosslrq-vYG-p9SttnJE",
  RESEARCH_SYNTHESIS:
    "https://w3id.org/np/RApmrqOEr4f5bJC2vayrTnzhwnuEfAU_I4Pdg8K5JxeBw",
  // Utility templates (not shown in the nanopub editor)
  COMMENT: "http://purl.org/np/RA3gQDMnYbKCTiQeiUYJYBaH6HUhz8f3HIg71itlsZDgA",
  APPROVE_OR_DISAPPROVE:
    "http://purl.org/np/RAx2PsXNbCcxYh3sOSScV9H0-tqyETuKjyHsgD6FPC3_E",
  APPROVE_INTRO:
    "http://purl.org/np/RAOmr2G967CF1gAfHH49W1VJdAdjE967OxWm7G_-Vq6yc",
};

/**
 * Legacy/previous versions of template URIs.
 * Used for viewing nanopubs created with older template versions.
 * Maps template key to array of legacy URIs.
 *
 * NOTE: we need to be careful to ensure backwards-compatible support for legacy
 * template versions in custom view components.
 */
export const LEGACY_TEMPLATE_URIS: Partial<
  Record<keyof typeof TEMPLATE_URI, string[]>
> = {
  AIDA_SENTENCE: [
    "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE",
    "http://purl.org/np/RAe39AG652u7Mj8nnuQdhfttfvu5vYTIARJwADGYLMjS0",
    "https://w3id.org/np/RAMs3KMOjAHN_4a3p5D2VvVE_kialJOKaVS7faQwnKniw",
  ],
  CITATION_CITO: [
    "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo",
  ],
  FORRT_CLAIM: [
    "https://w3id.org/np/RAu5uTahAxc0OLBB3vaGwK3OQDDZV7QuWtDlBk0Ea3bco",
    "https://w3id.org/np/RAVdxfm3fgFahBItmNmJX_Xkmg1xlimDtoSMjZgNIs2bQ",
  ],
  PICO_RESEARCH_QUESTION: [
    "https://w3id.org/np/RAfZfE1gbUtc35W7xT12XTO0ptZwycN2-jj7Jow6COAoQ",
  ],
  RESEARCH_SYNTHESIS: [
    "https://w3id.org/np/RA-ahnCOKnyLdqxUKbmRxFrXXc3PQMoa-_ce-W-J5-GLY",
  ],
};

/**
 * Reverse lookup: maps every legacy URI back to the current template URI.
 * Built automatically from LEGACY_TEMPLATE_URIS so it stays in sync.
 */
export const LEGACY_URI_TO_CURRENT_URI: ReadonlyMap<string, string> = new Map(
  Object.entries(LEGACY_TEMPLATE_URIS).flatMap(([key, uris]) =>
    (uris ?? []).map((uri) => [
      uri,
      TEMPLATE_URI[key as keyof typeof TEMPLATE_URI],
    ]),
  ),
);

/**
 * Resolves a template URI to its current version.
 * If the URI is already the current version it is returned as-is.
 * If it is a legacy URI the corresponding current URI is returned.
 * If the URI is unknown it is returned unchanged (caller can decide how to handle).
 */
export function resolveTemplateUri(uri: string): string {
  return LEGACY_URI_TO_CURRENT_URI.get(uri) ?? uri;
}

/**
 * Returns the template metadata for a given URI, resolving legacy URIs
 * to their current version first. Returns `undefined` if the URI is
 * not recognised as a current or legacy template.
 */
export function getTemplateMetadata(
  uri: string,
): NanopubTemplateMetadata | undefined {
  return TEMPLATE_METADATA[resolveTemplateUri(uri)];
}

/**
 * Template metadata without React components
 * Non-React workspaces (e.g., Zotero) should import this directly
 *
 * Grouped by category:
 *   1. Core (Citation, Annotation, Scientific)
 *   2. Data & Software
 *   3. PRISMA Systematic Review
 *   4. FORRT Replication
 */
export const TEMPLATE_METADATA: Record<string, NanopubTemplateMetadata> = {
  // ── Core ───────────────────────────────────────────────────────────
  [TEMPLATE_URI.CITATION_CITO]: {
    name: "Citation with CiTO",
    description:
      "Declare citations between papers or other works, using Citation Typing Ontology",
    category: "Citation",
    icon: "📚",
    color: "amber",
    recommended: true,
    keywords: ["citation", "cito", "reference", "cite"],
  },
  [TEMPLATE_URI.ANNOTATE_QUOTATION]: {
    name: "Annotate a paper quotation",
    description: "Annotating a paper quotation with personal interpretation",
    category: "Annotation",
    icon: "❝❞",
    color: "rose",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "interpretation"],
  },
  [TEMPLATE_URI.COMMENT_PAPER]: {
    name: "Comment on Paper",
    description: "Add comments, quotes, or evaluations to papers",
    category: "Annotation",
    icon: "💬",
    color: "sky",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "review"],
  },
  [TEMPLATE_URI.AIDA_SENTENCE]: {
    name: "AIDA Sentence",
    description: "Make structured scientific claims following the AIDA model",
    category: "Scientific",
    icon: "🔬",
    color: "emerald",
    recommended: true,
    keywords: ["aida", "claim", "assertion", "scientific"],
  },
  [TEMPLATE_URI.GEO_COVERAGE]: {
    name: "Document geographical coverage",
    description:
      "Documents the geographical area or region covered by a research paper's findings, data, or study scope.",
    moreDescription:
      "Identify the spatial coverage (e.g. Europe, Canada, or a specific geographical area) and provide supporting quotations from the paper that led to this conclusion. The resulting nanopublication can work with GeoSPARQL queries for efficient spatial discovery of research.",
    category: "geographical coverage",
    icon: "📝",
    color: "teal",
    recommended: false,
    keywords: ["statement", "general", "rdf", "triple"],
  },

  // ── Data & Software ────────────────────────────────────────────────
  [TEMPLATE_URI.DATASET]: {
    name: "FAIR Dataset",
    description:
      "Describe a FAIR Digital Object dataset with metadata including creators, version, license, and access information.",
    category: "Data",
    icon: "📊",
    color: "violet",
    recommended: true,
    keywords: ["dataset", "data", "fair", "digital object", "zenodo"],
  },
  [TEMPLATE_URI.RESEARCH_SOFTWARE]: {
    name: "Research Software",
    description:
      "Describe research software with metadata including repository, supporting publications, and related resources.",
    category: "Software",
    icon: "💻",
    color: "cyan",
    recommended: true,
    keywords: ["software", "code", "repository", "github", "tool"],
  },
  [TEMPLATE_URI.ODRL_POLICY]: {
    name: "ODRL Access Policy",
    description:
      "Define machine-readable access conditions for a dataset using ODRL. Specify permitted actions, purpose constraints, prohibitions, and attribution duties.",
    moreDescription:
      "ODRL (Open Digital Rights Language) is a W3C standard for expressing policies in a machine-readable way. Useful for FAIR data governance, automated compliance checking, and transparent licensing of research datasets.",
    category: "Data",
    icon: "🔐",
    recommended: false,
    keywords: [
      "odrl",
      "policy",
      "license",
      "access control",
      "fair",
      "governance",
      "compliance",
    ],
  },
  [TEMPLATE_URI.ODRL_ACCESS_GRANT]: {
    name: "ODRL Access Grant",
    description:
      "Record a signed, auditable grant of access to a FAIR dataset under a specific ODRL policy, assigning permissions to a requester identified by DID.",
    moreDescription:
      "Access grants create an immutable audit trail linking a policy, a dataset, a requester, and the granted actions. Use this after evaluating a policy to formally record the decision.",
    category: "Data",
    icon: "🎫",
    recommended: false,
    keywords: ["odrl", "grant", "access", "audit", "did", "fair", "governance"],
  },

  // ── PRISMA Systematic Review ───────────────────────────────────────
  [TEMPLATE_URI.PICO_RESEARCH_QUESTION]: {
    name: "PICO Research Question",
    description:
      "Define a research question using the PICO framework (Population, Intervention, Comparator, Outcome)",
    category: "Systematic Review",
    icon: "🔬",
    color: "indigo",
    recommended: true,
    keywords: [
      "pico",
      "research",
      "question",
      "population",
      "intervention",
      "comparator",
      "outcome",
      "prisma",
      "systematic review",
    ],
  },
  [TEMPLATE_URI.PCC_RESEARCH_QUESTION]: {
    name: "PCC Research Question",
    description:
      "Define a review question using the PCC framework (Population, Concept, Context)",
    category: "Systematic Review",
    icon: "📋",
    color: "cyan",
    recommended: true,
    keywords: [
      "pcc",
      "review",
      "question",
      "population",
      "concept",
      "context",
      "prisma",
      "systematic review",
    ],
  },
  [TEMPLATE_URI.PRISMA_SEARCH_STRATEGY]: {
    name: "PRISMA Search Strategy",
    description:
      "Document a systematic review search strategy following PRISMA 2020 guidelines.",
    moreDescription:
      "Captures search terms, databases, date ranges, languages, and methodology notes. Corresponds to PRISMA 2020 Item 7 (Search) for transparent, reproducible literature searches.",
    category: "Systematic Review",
    icon: "🔍",
    color: "amber",
    recommended: true,
    keywords: [
      "prisma",
      "systematic review",
      "search strategy",
      "literature",
      "meta-analysis",
    ],
  },
  [TEMPLATE_URI.PRISMA_DATABASE_SEARCH]: {
    name: "PRISMA Database Search",
    description:
      "Declare a systematic database search with query strings, filters, and result counts.",
    category: "Systematic Review",
    icon: "🗄️",
    color: "amber",
    recommended: false,
    keywords: ["prisma", "systematic review", "database", "search", "query"],
  },
  [TEMPLATE_URI.PRISMA_SEARCH_EXECUTION_DATASET]: {
    name: "PRISMA Search Execution Dataset",
    description:
      "Declare a PRISMA search execution dataset aggregating search results across databases.",
    category: "Systematic Review",
    icon: "📑",
    color: "amber",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "search execution",
      "dataset",
      "results",
    ],
  },
  [TEMPLATE_URI.PRISMA_STUDY_INCLUSION]: {
    name: "PRISMA Study Inclusion",
    description:
      "Declare a study to be included in a systematic review with rationale.",
    category: "Systematic Review",
    icon: "✅",
    color: "amber",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "study",
      "inclusion",
      "selection",
    ],
  },
  [TEMPLATE_URI.PRISMA_STUDY_ASSESSMENT]: {
    name: "PRISMA Study Assessment",
    description:
      "Declare a PRISMA study assessment dataset with quality and bias evaluations.",
    category: "Systematic Review",
    icon: "📝",
    color: "amber",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "study",
      "assessment",
      "quality",
      "bias",
    ],
  },
  [TEMPLATE_URI.PRISMA_FULL_SCREENING]: {
    name: "PRISMA Full Screening Selection",
    description:
      "Declare a study to be selected for full-text screening in a systematic review.",
    category: "Systematic Review",
    icon: "🔎",
    color: "amber",
    recommended: false,
    keywords: [
      "prisma",
      "systematic review",
      "screening",
      "full text",
      "selection",
    ],
  },

  // ── FORRT Replication ──────────────────────────────────────────────
  [TEMPLATE_URI.FORRT_CLAIM]: {
    name: "FORRT Claim",
    description:
      "Declare an original claim according to FORRT, linking it to an AIDA sentence with a specific FORRT type.",
    category: "Replication",
    icon: "🎓",
    color: "violet",
    recommended: true,
    keywords: ["forrt", "claim", "aida", "scientific", "replication"],
  },
  [TEMPLATE_URI.FORRT_REPLICATION]: {
    name: "FORRT Replication Study",
    description:
      "Declare a replication or reproduction study design according to FORRT, targeting a specific claim.",
    category: "Replication",
    icon: "🔁",
    color: "violet",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "reproduction",
      "study",
      "claim",
      "scientific",
    ],
  },
  [TEMPLATE_URI.FORRT_REPLICATION_OUTCOME]: {
    name: "FORRT Replication Outcome",
    description:
      "Declare the outcome of a replication or reproduction study, including validation status, confidence, and conclusions.",
    category: "Replication",
    icon: "📊",
    color: "teal",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "outcome",
      "validation",
      "reproduction",
      "result",
    ],
  },
  [TEMPLATE_URI.FORRT_KL_REPLICATION]: {
    name: "FORRT Knowledge Loom Replication Study",
    description:
      "Declare a replication study with structured Knowledge Loom metadata: software methods, packages, input data, and analysis scripts.",
    category: "Scientific",
    icon: "🔁",
    color: "violet",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "knowledge loom",
      "dtreg",
      "reproduction",
      "study",
    ],
  },
  [TEMPLATE_URI.FORRT_KL_REPLICATION_OUTCOME]: {
    name: "FORRT Knowledge Loom Replication Outcome",
    description:
      "Declare a replication outcome with machine-readable evidence from Knowledge Loom: dtreg proof, analysis type, and key results.",
    category: "Scientific",
    icon: "📊",
    color: "teal",
    recommended: true,
    keywords: [
      "forrt",
      "replication",
      "outcome",
      "knowledge loom",
      "dtreg",
      "proof",
      "evidence",
    ],
  },
  [TEMPLATE_URI.RESEARCH_SYNTHESIS]: {
    name: "Science Live Research Synthesis",
    description:
      "Synthesise findings across multiple replication outcomes with conclusions, recommendations, conditions, and limitations.",
    moreDescription:
      "Aggregate evidence from supporting nanopubs, link Wikidata topics, and publish actionable recommendations for practitioners.",
    category: "Replication",
    icon: "🧬",
    recommended: true,
    keywords: [
      "synthesis",
      "research synthesis",
      "replication",
      "recommendation",
      "forrt",
      "evidence",
    ],
  },
};

/**
 * Static Tailwind color class mappings for template colors.
 * Tailwind CSS uses static analysis to detect class names at build time.
 * Dynamic strings like `text-${color}-600` are NOT detected, so the CSS
 * for those classes is never generated. This map ensures every class
 * string appears literally in source so Tailwind can scan it.
 */
export const TEMPLATE_COLOR_CLASSES: Record<
  string,
  { light: string; dark: string }
> = {
  amber: { light: "text-amber-600", dark: "text-amber-300" },
  rose: { light: "text-rose-600", dark: "text-rose-300" },
  sky: { light: "text-sky-600", dark: "text-sky-300" },
  emerald: { light: "text-green-700", dark: "text-green-500" },
  teal: { light: "text-teal-600", dark: "text-teal-300" },
  violet: { light: "text-violet-600", dark: "text-violet-300" },
  cyan: { light: "text-cyan-600", dark: "text-cyan-300" },
  indigo: { light: "text-indigo-600", dark: "text-indigo-300" },
};

export const TEMPLATE_BORDER_CLASSES: Record<
  string,
  { light: string; dark: string }
> = {
  amber: { light: "border-l-amber-500", dark: "border-l-amber-400" },
  rose: { light: "border-l-rose-500", dark: "border-l-rose-400" },
  sky: { light: "border-l-sky-500", dark: "border-l-sky-400" },
  emerald: { light: "border-l-green-500", dark: "border-l-green-400" },
  teal: { light: "border-l-teal-500", dark: "border-l-teal-400" },
  violet: { light: "border-l-violet-500", dark: "border-l-violet-400" },
  cyan: { light: "border-l-cyan-500", dark: "border-l-cyan-400" },
  indigo: { light: "border-l-indigo-500", dark: "border-l-indigo-400" },
};

/** Resolves a theme value to "light" or "dark", defaulting to "light" for undefined/"system". */
function resolveTheme(
  theme: "light" | "dark" | "system" | undefined,
): "light" | "dark" {
  if (theme === "dark") return "dark";
  return "light";
}

/** Returns a Tailwind text-color class for the given template color and theme, or the fallback class. */
export function getTemplateColorClass(
  color: string | undefined,
  theme: "light" | "dark" | "system" | undefined,
  fallback = "text-primary",
): string {
  if (!color) return fallback;
  return TEMPLATE_COLOR_CLASSES[color]?.[resolveTheme(theme)] ?? fallback;
}

/** Returns a Tailwind border-color class for the given template color and theme, or the fallback class. */
export function getTemplateBorderClass(
  color: string | undefined,
  theme: "light" | "dark" | "system" | undefined,
  fallback = "border-l-border",
): string {
  if (!color) return fallback;
  return TEMPLATE_BORDER_CLASSES[color]?.[resolveTheme(theme)] ?? fallback;
}
