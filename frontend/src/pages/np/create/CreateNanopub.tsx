"use client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown, FilePlus } from "lucide-react";
import * as React from "react";
import AIDASentence from "./components/AIDASentence";
import AnnotateAPaperQuotation from "./components/AnnotateAPaperQuotation";
import CitationWithCiTO from "./components/CitationWithCiTO";
import CommentOnPaper from "./components/CommentOnPaper";
import DocumentGeographicalCoverage from "./components/DocumentGeographicalCoverage";

/**
 * Template definition
 */
export interface NanopubTemplate {
  uri: string; // Permanent nanopub URI
  name: string; // Display name
  description: string; // What this template is for
  category: string; // Category for grouping
  icon: string; // Emoji icon (optional)
  recommended?: boolean; // Show in main menu
  keywords?: string[]; // For search
  component?: React.ReactElement;
}

/**
 * POPULAR TEMPLATES
 * These appear in the main template selector
 */
export const POPULAR_TEMPLATES: Record<string, NanopubTemplate> = {
  "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo": {
    uri: "https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo",
    name: "Citation with CiTO",
    description:
      "Declare citations between papers using Citation Typing Ontology",
    category: "Citation",
    icon: "📚",
    recommended: true,
    keywords: ["citation", "cito", "reference", "cite"],
    component: <CitationWithCiTO />,
  },
  "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU": {
    uri: "https://w3id.org/np/RA24onqmqTMsraJ7ypYFOuckmNWpo4Zv5gsLqhXt7xYPU",
    name: "Annotate a paper quotation",
    description: "Annotating a paper quotation with personal interpretation",
    category: "Annotation",
    icon: "❝❞",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "interpretation"],
    component: <AnnotateAPaperQuotation />,
  },
  "https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI": {
    uri: "https://w3id.org/np/RAVEpTdLrX5XrhNl_gnvTaBcjRRSDu_hhZix8gu2HO7jI",
    name: "Comment on Paper",
    description: "Add comments, quotes, or evaluations to papers",
    category: "Annotation",
    icon: "💬",
    recommended: true,
    keywords: ["comment", "annotation", "quote", "review"],
    component: <CommentOnPaper />,
  },
  "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE": {
    uri: "https://w3id.org/np/RA4fmfVFULMP50FqDFX8fEMn66uDF07vXKFXh_L9aoQKE",
    name: "AIDA Sentence",
    description: "Make structured scientific claims following the AIDA model",
    category: "Scientific",
    icon: "🔬",
    recommended: true,
    keywords: ["aida", "claim", "assertion", "scientific"],
    component: <AIDASentence />,
  },
  "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao": {
    uri: "https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao",
    name: "Document geographical coverage",
    description:
      "Document the geographical area or region covered by a resercher paper, data, or study.",
    category: "geographical coverage",
    icon: "📝",
    recommended: false,
    keywords: ["statement", "general", "rdf", "triple"],
    component: <DocumentGeographicalCoverage />,
  },
};

export function ComboboxDemo({
  setSelection,
}: {
  setSelection: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[500px] justify-between"
        >
          {selected ? POPULAR_TEMPLATES[selected]?.name : "Select template..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <Command>
          <CommandInput placeholder="Search template..." className="h-9" />
          <CommandList>
            <CommandEmpty>No template found.</CommandEmpty>
            <CommandGroup>
              {Object.entries(POPULAR_TEMPLATES).map(([k, t]) => (
                <CommandItem
                  className="grid auto-rows-max grid-flow-row"
                  key={t.name}
                  value={k}
                  keywords={[...t.keywords!, t.name]}
                  onSelect={(value) => {
                    setSelected(value);
                    setOpen(false);
                    setSelection(value);
                  }}
                >
                  <span className="font-bold">{t.name}</span>
                  <span className="text-muted-foreground">{t.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateNanopub() {
  const [selected, setSelected] = React.useState("");

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="flex items-center text-xl text-muted-foreground font-black">
          <FilePlus className="mr-4" />
          CREATE NANOPUBLICATION
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          {" "}
          <ComboboxDemo setSelection={setSelected} />
        </div>
      </div>
      {selected ? (
        <>
          <div className="font-bold">
            {" "}
            {POPULAR_TEMPLATES[selected].description}
          </div>{" "}
          {POPULAR_TEMPLATES[selected].component}
        </>
      ) : (
        <>Select a template above.</>
      )}
    </main>
  );
}
