/**
 * Format a Date as `YYYY-MM-DD` using its **local** calendar fields.
 *
 * Do not use `toISOString().split("T")[0]` for this: the date pickers (and the
 * chain wizard's prefill coercion) produce a Date at local midnight, which
 * `toISOString` converts to UTC — shifting the day back by one for every user
 * east of UTC. The resulting date is written into a signed, immutable
 * nanopublication, so the off-by-one is not recoverable after publishing.
 */
export const formatDateOnly = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const pemHeader = "-----BEGIN PRIVATE KEY-----";
const pemFooter = "-----END PRIVATE KEY-----";

export const unwrapPEMKey = (pemKey: string) => {
  const cleanKey = pemKey.trim();

  const base64Key = cleanKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  return base64Key;
};

export const wrapKeyPEM = (base64Key: string) => {
  const cleanKey = base64Key.trim();
  if (cleanKey.startsWith(pemHeader) && cleanKey.endsWith(pemFooter)) {
    return base64Key;
  }

  const base64Content = cleanKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const chunks = base64Content.match(/.{1,64}/g) || [];
  const formattedKey = chunks.join("\n");

  return `${pemHeader}\n${formattedKey}\n${pemFooter}`;
};

export const bestLabelForRow = (row: any) => {
  // Largely to apply workaround for confusing legacy "NP created using..."
  // labels appearing in search result listing.
  // If label starts with "NP created using" and we have a description
  // (e,g, from introduced subject's rdfs:label), use the description instead
  return row.label?.startsWith("NP created using") && row.description
    ? row.description
    : row.label || "";
};
