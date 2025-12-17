import { createHash } from "@better-auth/utils/hash";
import { Literal, Quad } from "n3";

// TODO: this entire file was AI generated as a placeholder, based on rdfhasher.py from https://github.com/trustyuri/trustyuri-python/blob/master/trustyuri/rdf/RdfHasher.py
// The code is most likely wrong and omits proper normalization.
// It needs to be replaced by a proper implementation later or use the nanopub-js library once it has this functionality

/**
 * Convert RDF term to string representation for hashing
 */
function valueToString(value: any): string {
  if (value === null || value === undefined) {
    return "\n";
  } else if (value.termType === "NamedNode") {
    return value.value + "\n";
  } else if (value.termType === "Literal") {
    const literal = value as Literal;
    if (literal.language) {
      // TODO: proper canonicalization of language tags
      return (
        "@" +
        literal.language.toLowerCase() +
        " " +
        escapeString(literal.value) +
        "\n"
      );
    }
    if (literal.datatype) {
      return (
        "^" + literal.datatype.value + " " + escapeString(literal.value) + "\n"
      );
    }
    return (
      "^http://www.w3.org/2001/XMLSchema#string " +
      escapeString(literal.value) +
      "\n"
    );
  } else if (value.termType === "BlankNode") {
    return value.value + "\n";
  } else {
    // Fallback for any other term types
    return value.toString() + "\n";
  }
}

/**
 * Escape special characters in strings
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

/**
 * Convert string to base64 URL-safe format (similar to TrustyUriUtils.get_base64)
 */
function toBase64UrlSafe(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Create hash from RDF quads
 *
 * TODO: Implement preprocessing and sorting as in the original Python version
 * TODO: The original Python code uses trustyuri library for preprocessing and sorting
 *       This implementation currently skips those steps
 */
export async function makeHash(quads: Quad[], _hashstr?: string) {
  // TODO: Implement preprocessing (currently skipped)
  // quads = preprocess(quads, hashstr=hashstr);

  // TODO: Implement sorting with StatementComparator (currently skipped)
  // const comp = StatementComparator(hashstr);
  // quads = sorted(quads, key=cmp_to_key(lambda q1, q2: comp.compare(q1, q2)));

  let s = "";
  let previous = "";

  for (const q of quads) {
    let e = "";
    e += valueToString(q.subject);
    e += valueToString(q.predicate);
    e += valueToString(q.object);
    e += valueToString(q.graph);

    if (e !== previous) {
      s += e;
    }
    previous = e;
  }

  const hash = toBase64UrlSafe(await createHash("SHA-256", "base64").digest(s));

  return "RA" + hash;
}
