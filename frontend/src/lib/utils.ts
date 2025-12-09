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
 */
export function getUriFragment(uri: string) {
  const fragment = new URL(uri).hash;
  return fragment ? fragment.replace("#", "") : undefined;
}
