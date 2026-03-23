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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import {
  Book,
  ChevronDown,
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCite, setSelectedCite] =
    useState<keyof typeof citationTypes>("apa");

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-lg border bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Quote className="h-5 w-5" />
          <span>Cite Nanopublication</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Snippet onValueChange={setSelectedCite} value={selectedCite}>
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
      </CollapsibleContent>
    </Collapsible>
  );
}
