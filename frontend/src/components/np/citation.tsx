import { CardTitle } from "@/components/ui/card";
import {
  Snippet,
  SnippetCopyButton,
  SnippetHeader,
  SnippetTabsContent,
  SnippetTabsList,
  SnippetTabsTrigger,
} from "@/components/ui/shadcn-io/snippet";
import { generateCitation, Metadata } from "@/lib/nanopub-store";
import {
  Book,
  Code2,
  GraduationCap,
  Landmark,
  LucideIcon,
  Quote,
} from "lucide-react";
import { useState } from "react";

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

export function Citation({ data }: { data?: Metadata }) {
  const [selectedCite, setSelectedCite] =
    useState<keyof typeof citationTypes>("apa");

  return (
    <Snippet onValueChange={setSelectedCite} value={selectedCite}>
      <CardTitle className="m-4 text-muted-foreground items-center flex gap-2">
        <Quote />
        Cite Nanopublication
      </CardTitle>
      <SnippetHeader>
        <SnippetTabsList>
          {Object.entries(citationTypes).map(([k, c]) => (
            <SnippetTabsTrigger key={k} value={k}>
              <c.icon size={14} />
              <span>{c.label}</span>
            </SnippetTabsTrigger>
          ))}
        </SnippetTabsList>
        {selectedCite && (
          <SnippetCopyButton
            onCopy={() => console.log(`Copied to clipboard`)}
            onError={() => console.error(`Failed to copy to clipboard`)}
            value={generateCitation(data, selectedCite)}
          />
        )}
      </SnippetHeader>
      <SnippetTabsContent
        key={selectedCite}
        value={selectedCite}
        className="whitespace-normal wrap-break-word"
      >
        {generateCitation(data, selectedCite)}
      </SnippetTabsContent>
    </Snippet>
  );
}
