import { clsx, type ClassValue } from "clsx";
import { Book, Code2, GraduationCap, Landmark, LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Metadata } from "./nanopub-store";

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
 * Generate citation in different formats
 */
export function generateCitation(
  data?: Metadata,
  format: keyof typeof citationTypes = "apa",
) {
  const author = data?.creators?.[0].name || "Unknown Author";
  const year = data?.created ? new Date(data.created).getFullYear() : "n.d.";
  const title = data?.title || "Untitled Nanopublication";
  const uri = data?.uri;

  if (!uri) return "";

  // Extract just the nanopub ID for cleaner display
  const npId = uri.split("/").pop();

  const formats = {
    apa: `${author}. (${year}). <em>${title}</em> [Nanopublication]. ${uri}`,
    mla: `${author}. "${title}." <em>Nanopublication</em>, ${year}, ${uri}.`,
    chicago: `${author}. "${title}." Nanopublication. ${year}. ${uri}.`,
    bibtex: `@misc{nanopub_${npId},
  author = {${author}},
  title = {${title}},
  year = {${year}},
  howpublished = {Nanopublication},
  url = {${uri}}
}`,
  };

  return formats[format as keyof typeof formats] || formats.apa;
}

export const citationTypes: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  apa: {
    label: "APA",
    icon: Book,
  },
  mla: {
    label: "MLA",
    icon: GraduationCap,
  },
  chicago: {
    label: "Chicago",
    icon: Landmark,
  },
  bibtex: {
    label: "BibTeX",
    icon: Code2,
  },
};
