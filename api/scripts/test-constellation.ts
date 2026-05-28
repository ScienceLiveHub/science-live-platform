/**
 * Smoke-test the constellation builder against a real nanopub URI.
 *
 * Usage:
 *   npx tsx api/scripts/test-constellation.ts [URI]
 *
 * Default URI is the Bombus apex CiTO Citation from the weatherxbiodiversity
 * replication — the plan's acceptance criterion says we should reach 19/19
 * nanopubs from this entry.
 */
import { buildConstellation } from "../src/np/constellation";

const DEFAULT_URI =
  "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";

const uri = process.argv[2] ?? DEFAULT_URI;

console.error(`Building constellation from: ${uri}`);
console.error("(this hits KnowledgePixels SPARQL + W3ID TriG resolver)\n");

const t0 = Date.now();
const c = await buildConstellation(uri);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.error(
  `\nReached ${c.nodeCount} nanopubs / ${c.edgeCount} edges in ${elapsed}s\n`,
);

const byType = new Map<string, number>();
for (const n of c.nodes) {
  const key = n.stepType || "<no template label>";
  byType.set(key, (byType.get(key) ?? 0) + 1);
}

console.error("Step-type breakdown:");
for (const [t, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
  console.error(`  ${String(count).padStart(3)} × ${t}`);
}

console.error("\nNanopub list:");
for (const n of c.nodes) {
  const id = n.uri.match(/\/np\/(RA[A-Za-z0-9_-]+)/)?.[1] ?? n.uri;
  console.error(`  ${id}  ${n.stepType || "(no template)"}`);
}

console.error(`\nExternal citations (${c.externalCitations.length}):`);
for (const e of c.externalCitations) console.error(`  ${e}`);
