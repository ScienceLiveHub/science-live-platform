import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind classname merge helper
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a valid full URI based on an input in any format, including just the hash part
 */
export function parseURI(uri?: string) {
  return uri
    ? uri.startsWith("http")
      ? uri
      : // TODO: this could be something other than w3id.org/np e.g. purl/ or w3id.org/sciencelive etc
        // we whould probably switch to a query string or have that as an alternative
        `https://w3id.org/np/${uri}`
    : "";
  // TODO: could be other tidy up like strip suffixes.
  // Also note http or https are distinct and both can be used in the official URI which would each be unique URIs
}

/**
 * Returns the fragment of the URL, if any (i.e. after the hash: "http://www.example.com/page#section" -> "section")
 * Uses indexOf (not lastIndexOf) to find the first # symbol, as per URL standards
 */
export function getUriFragment(uri: string): string {
  if (!uri || typeof uri !== "string") {
    return "";
  }

  const index = uri.indexOf("#");
  if (index < 0 || index === uri.length - 1) {
    return "";
  }

  return uri.substring(index + 1);
}

/**
 * Returns the last element of the URL, in prescedence: #fragment, end of path, last element in path (if ends with /)
 */
export function getUriEnd(uri: string) {
  const u = new URL(uri);
  if (u.hash?.length > 1) {
    return u.hash.replace("#", "");
  }
  const end = u.pathname.split("/").pop();
  if (end) {
    return end;
  }
  const lastPath = u.pathname.slice(0, -1).split("/").pop();
  if (lastPath) {
    return lastPath;
  }
  return undefined;
}

/**
 * Detect if it is valid nanupublication URI (without any additional suffix/path)
 *
 * TODO: align with spec https://trustyuri.net/
 */
export function isNanopubUri(uri: string) {
  // TODO: might not be prefixed with /np/ before could be anything e.g. /sciencelive/ or /sl/np. etc,
  //       could be any non-Base64 char before module code and hash "R...."
  // TODO: valid "module codes" are currently FA, RA, RB according to spec
  const npIndex = uri?.search("/np/R");
  const hash = uri?.substring(npIndex + 4);
  return !!(
    npIndex &&
    hash &&
    // i.e. Base64: A-Z a-z 0-9 - _
    hash.match(new RegExp("^[A-Za-z0-9_-]+$")) &&
    hash.length === 45
  );
}

export function isDoiUri(uri: string) {
  return uri.startsWith("https://doi.org/10.");
}

/**
 * Normalize an orcid URI
 */
export function cleanOrcidUri(uri: string) {
  return uri.startsWith("https://orcid.org/")
    ? uri
    : `https://orcid.org/${uri.replace(/https?:\/\/orcid\.org\//, "")}`;
}

export function extractOrcidId(href: string): string | null {
  const match = href.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9Xx])/);
  if (!match) return null;
  const orcid = match[1];
  return `${orcid.slice(0, -1)}${orcid.slice(-1).toUpperCase()}`;
}

export const unique = (arr: string[]) => Array.from(new Set(arr));
