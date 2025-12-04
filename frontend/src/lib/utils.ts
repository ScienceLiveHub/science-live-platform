import { clsx, type ClassValue } from "clsx";
import { Book, Code2, GraduationCap, Landmark, LucideIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Metadata } from "./store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate citation in different formats
 */
export function generateCitation(
  data?: Metadata,
  format: keyof typeof citationTypes = "apa",
) {
  const author = data?.creators?.[0] || "Unknown Author";
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
