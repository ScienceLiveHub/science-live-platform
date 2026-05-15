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
