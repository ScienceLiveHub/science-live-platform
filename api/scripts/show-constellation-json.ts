import { buildConstellation } from "../src/np/constellation";

const URI =
  process.argv[2] ??
  "https://w3id.org/sciencelive/np/RA1q6c0fG2bMbiozF8Az2UpIfzAzqp8hoVEl6QIzfUpH8";

const c = await buildConstellation(URI);
console.log(JSON.stringify(c, null, 2));
