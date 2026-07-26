// Rebuild / audit the LEGACY_TEMPLATE_URIS map from the nanopub network.
//
// Browse/search filter nanopubs by `wasCreatedFromTemplate`, so nanopubs made
// with an older template version disappear from results unless that version is
// listed in LEGACY_TEMPLATE_URIS (registry-metadata.ts). Templates get superseded
// through trial-and-error, and hand-maintaining that map is how it went stale.
//
// This tool keeps only versions with LIVE nanopubs (valid signature, not
// invalidated, not themselves superseded) — the ones a user can actually see.
//
// IMPORTANT: it does NOT rely on the `npx:supersedes` chain alone. Several live
// legacy versions are "orphans" not reachable via supersedes from the current
// template (parallel lineages / broken chains) — e.g. CITATION_CITO's RAX_4tWT
// with 100+ live nanopubs. So candidates = the current map's entries UNION each
// template's supersedes chain; the network then decides which are still live.
// => Existing entries are preserved (an orphan removed here can't be rediscovered),
//    new used-and-superseded versions are added, and dead entries are dropped.
//
// Usage:  node scripts/discover-legacy-template-uris.mjs
// Then reconcile the printed block with LEGACY_TEMPLATE_URIS in registry-metadata.ts.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ENDPOINT = "https://query.knowledgepixels.com/repo/full";
const META = join(
  dirname(fileURLToPath(import.meta.url)),
  "../frontend/src/pages/np/create/components/templates/registry-metadata.ts",
);
const SRC = readFileSync(META, "utf8");

function parseUriMap(constName) {
  const block = SRC.match(new RegExp(`${constName}[^{]*\\{([\\s\\S]*?)\\n\\};`));
  if (!block) throw new Error(`${constName} not found`);
  const out = {};
  let m;
  // KEY: [ "uri", "uri" ]  or  KEY: "uri"
  const arr = /(\w+):\s*\[([\s\S]*?)\]/g;
  while ((m = arr.exec(block[1]))) {
    out[m[1]] = [...m[2].matchAll(/"(https?:\/\/[^"]+)"/g)].map((x) => x[1]);
  }
  const single = /(\w+):\s*\n?\s*"(https?:\/\/[^"]+)"/g;
  while ((m = single.exec(block[1]))) if (!out[m[1]]) out[m[1]] = [m[2]];
  return out;
}
function parseFeedKeys() {
  const b = SRC.match(/FEED_TEMPLATE_KEYS = \[([\s\S]*?)\]/);
  return b ? [...b[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : Object.keys(TEMPLATES);
}

const TEMPLATES = parseUriMap("TEMPLATE_URI");
const EXISTING = parseUriMap("LEGACY_TEMPLATE_URIS");
const FEED = new Set(parseFeedKeys());

async function sparql(q) {
  const r = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!r.ok) throw new Error(`SPARQL ${r.status}`);
  return (await r.json()).results.bindings;
}
const P = `PREFIX npx: <http://purl.org/nanopub/x/>
PREFIX npa: <http://purl.org/nanopub/admin/>
PREFIX nt: <https://w3id.org/np/o/ntemplate/>`;
const chain = (u) =>
  sparql(`${P} SELECT ?o WHERE { <${u}> npx:supersedes+ ?o }`).then((r) => r.map((b) => b.o.value));
const liveCount = (u) =>
  sparql(`${P} SELECT (COUNT(DISTINCT ?np) as ?n) WHERE {
      GRAPH ?g { ?np nt:wasCreatedFromTemplate <${u}> }
      GRAPH npa:graph { ?np npa:hasValidSignatureForPublicKeyHash ?pk }
      FILTER NOT EXISTS { ?x npx:invalidates ?np ; npa:hasValidSignatureForPublicKeyHash ?pk2 }
      FILTER NOT EXISTS { ?y npx:supersedes ?np } }`).then((r) => Number(r[0]?.n?.value ?? 0));

const result = {};
for (const [key, uri] of Object.entries(TEMPLATES)) {
  if (!FEED.has(key)) continue; // only templates offered in the browse filter
  const candidates = new Set([...(EXISTING[key] ?? []), ...(await chain(uri))]);
  const kept = [];
  for (const c of candidates) if ((await liveCount(c)) > 0) kept.push(c);
  if (kept.length) result[key] = kept;
  process.stderr.write(`${key}: ${candidates.size} candidate(s), ${kept.length} live\n`);
}

console.log("\n// reconcile with LEGACY_TEMPLATE_URIS in registry-metadata.ts:\n");
for (const [key, uris] of Object.entries(result)) {
  console.log(`  ${key}: [`);
  for (const u of uris) console.log(`    "${u}",`);
  console.log("  ],");
}
