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
 * Detect whether it is valid nanupublication URI (without any additional suffix/path)
 *
 */
export function isNanopubUri(uri: string) {
  return !!getNanopubHash(uri);
}

export function getNanopubHash(uri: string) {
  // TODO: align with spec https://trustyuri.net/
  // TODO: might not be prefixed with /np/ before could be anything e.g. /sciencelive/ or /sl/np. etc,
  //       could be any non-Base64 char before module code and hash "R...."
  // TODO: valid "module codes" are currently FA, RA, RB according to spec
  const npIndex = uri?.search("/np/R");
  const hash = uri?.substring(npIndex + 4);

  return npIndex &&
    hash &&
    hash.match(new RegExp("^[A-Za-z0-9_-]+$")) &&
    hash.length === 45
    ? hash
    : undefined;
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

export const EXAMPLE_privateKey =
  "MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDNQEcoXXchdpTm71Tidhyr1BMJp8jYeVg7/oLbmE5WOJ0hilSH/bmivywB+HoTOr6/3tpinw0Bws2M2m/7LLnDaaeYB5RC2DoD2BKBa499yOHa3rGMGOh/viyCGOJbjFPINlMhsIzsr+wvktHw0JclfW508lHmudjzR1/6B3OPdbj6Xw292VHIRt2WdyCmPEc8/3zvzuycQ3xsURnMxRoAdFqIf5iP30pn9uqP+Ex1rUaZ4lbrU8AuNPys3fiIPDVTYgsh4alY/IcYvd5OCvn2uw4LoXd/JZb9EJuS1KYK9v/DRirCdlvSNh4hy5UE7/nNgmXDt3xYjDfzOYN/8N9hAgMBAAECggEANbec5/OOOjPOxKHelWZUGqRmVyCScBVSAmGZ3d7+oZIvjZemh/DfpLhjzCA70syNH6ozfZwiy1MweKyyogoSlBISyrcxFk2A4YCrVzPPWhw5AA9IaGIcd1JOU74vf8Y6JywQlcCfIVLpfYnvaBcvd6BcSD8jMD9ziDgl5koM9H5iVDAr/J7XTm7iRxT3keCmfwBSs1rI0HB156e/QvG8eX/XX4hqrTJsRzC9S6wwkD/KSxan+ZHqN5d5eRI/3g9AYXNRqj0Nq2GOR2m4yC4UbL3ua7gEGxueErbKIm6uzWnCZSSV5fWXAALCmgILHeMpMMTej9+nd9ha2D3gJAoAAQKBgQDPV2sXW97OaL7jnTKd6tFbPgjrZ4YdkP917XTpOkhldJmiwhCDWo5BUSeo0aihB0rYwDNpGNgyBA9BNM5lBSCWrpAT3FMWrsUX6Y5Lg9UBaY5eXATmqf29YZPrWHG5b0vuU4MB59GzMPzAnzlysxLarzPbQBvXSeCNwLXtTKukcQKBgQD9a0Yb7FMNNHQlG8lOkftGRRIBejt+KPpg4cLF57nZJ5xgYaky+aiJLzZaof2Tmo7tsB3tlHv59opA9BCjB6iJ23OXTuO1Z5nqwH/PLe3m9QUd3syRgJ9a04is/GdxcUWUFG8shIBn1Gv0AYvZPwYXLduvdU5mnfTwKJfClvCh8QKBgQCfG3Mniq1QcZrCadf0zMP5I4KOunN1btZKNXz4mGwDxtU6y3cGhVASmWc4qiKf50utRthsts74mprmK9KSPLwERVJ0myb7igPe1LAIDNNA8TJ6AF0WcK4xTJbJC6bBaMG40kb/CFioDFh4q/bWqMo4HChMAEcdDykNPiudPK+eUQKBgQCWKuIxm7mfIo0MjEme0Gx4uGcyDu+AE+JCVKVpRqZfYtSMXHK57S0Mlbh8vm8X70dw26LwbMOGXKySTs4o/VnGzw7RA4N1tH2FmSpjZ5EJAfpVN/g65GAJnz3nW+4kT/3uAKncVGwOmtaZke0AABOo2pjKgRXDQyiowzUirvTK0QKBgQDOKqcTGGphC1pIpF/SUtdya0YXNoNoPtFBG5YmWjW0X7MonCisR0ffMsbqJWD00q2rzNG9kTU6u/3lKHrFFVktFQRYj4DJcLBxowt2j/WNiUOekFFw/xFbTCq7Sb2IoYUnQQPETKkrSq1WaAJ30rQRjhbXlpTPBOXj+tUrZ/BS+w==";
export const EXAMPLE_publicKey =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzUBHKF13IXaU5u9U4nYcq9QTCafI2HlYO/6C25hOVjidIYpUh/25or8sAfh6Ezq+v97aYp8NAcLNjNpv+yy5w2mnmAeUQtg6A9gSgWuPfcjh2t6xjBjof74sghjiW4xTyDZTIbCM7K/sL5LR8NCXJX1udPJR5rnY80df+gdzj3W4+l8NvdlRyEbdlncgpjxHPP98787snEN8bFEZzMUaAHRaiH+Yj99KZ/bqj/hMda1GmeJW61PALjT8rN34iDw1U2ILIeGpWPyHGL3eTgr59rsOC6F3fyWW/RCbktSmCvb/w0YqwnZb0jYeIcuVBO/5zYJlw7d8WIw38zmDf/DfYQIDAQAB";
