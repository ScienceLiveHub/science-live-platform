"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { NanopubStore } from "@/lib/nanopub-store";
import { NanopubTemplate } from "@/lib/nanopub-template";
import { publishRdf } from "@/lib/rdf";
import { EXAMPLE_privateKey, toScienceLiveNPUri } from "@/lib/uri";
import {
  BookCheck,
  ChevronsUpDown,
  ExternalLink,
  FilePlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AnyStatementTemplate from "./AnyStatementTemplate";
import { NanopubViewer } from "./NanopubViewer";
import { POPULAR_TEMPLATES } from "./templates/registry";

export interface NanopubEditorProps {
  /**
   * The identity to sign the nanopub with.
   * If null, publishing will be blocked/prompt for auth.
   */
  identity?: {
    name: string;
    orcid: string;
    privateKey: string;
  } | null;

  /**
   * The URI of the template to use.
   * If null, the template selection UI will be shown.
   */
  templateUri: string | null;

  /**
   * Callback when the template URI changes (e.g. user selects one).
   */
  onTemplateUriChange?: (uri: string | null) => void;

  /**
   * Optional prefilled data for the form.
   */
  prefilledData?: any;

  /**
   * Optional override for the publish server URL.
   */
  publishServer?: string;

  /**
   * Callback after successful publish.
   */
  onPublished?: (result: {
    uri: string;
    signedRdf: string;
    publishResponseText?: string;
  }) => void | Promise<void>;

  /**
   * If true, minimal UI is rendered (e.g. for embedded context).
   * Currently used to hide the header if needed, but we might want to keep it.
   */
  embedded?: boolean;

  /**
   * If true, forces ExampleNanopublication property for generated RDF.
   */
  demoMode?: boolean;

  /**
   * A function to call if an ORCID is not found, to help the user correct it.
   */
  orcidLinkAction?: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void;
}

export function TemplateCombobox({
  setSelection,
}: {
  setSelection: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-125 justify-between"
        >
          {selected ? POPULAR_TEMPLATES[selected]?.name : "Select template..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-125 p-0">
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
                  <span className="font-light">{t.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function NanopubEditor({
  identity,
  templateUri,
  onTemplateUriChange,
  prefilledData,
  publishServer,
  onPublished,
  orcidLinkAction,
  embedded = false,
  demoMode = false,
}: NanopubEditorProps) {
  // Local state for the "custom URI" input (when not using predefined template)
  const [inputUri, setInputUri] = useState<string | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [generatedRdf, setGeneratedRdf] = useState<string>("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [publishComplete, setPublishComplete] = useState(false);
  const [publishedUri, setPublishedUri] = useState<string | null>(null);
  const [previewStore, setPreviewStore] = useState<NanopubStore | null>(null);
  const scrollBottomRef = useRef(null);
  const scrollPreviewRef = useRef(null);

  // Derived state to determine if we are using a predefined template
  const isPredefined = templateUri && POPULAR_TEMPLATES[templateUri];
  const TemplateComp = isPredefined
    ? POPULAR_TEMPLATES[templateUri]?.component
    : undefined;

  useEffect(() => {
    if (generatedRdf) {
      NanopubStore.loadString(generatedRdf)
        .then((store) => {
          setPreviewStore(store);
        })
        .catch((err) => {
          console.error("Failed to parse generated RDF for preview", err);
          setPreviewStore(null);
        });
    } else {
      setPreviewStore(null);
    }
  }, [generatedRdf]);

  const handleLoadCustomTemplate = () => {
    const uri = inputUri?.trim();
    if (!uri) {
      toast.error("Please enter a template URI");
      return;
    }
    onTemplateUriChange?.(uri);
  };

  const generateNanopub = async (data: any) => {
    console.log("Data entered:", data);

    if (!identity) {
      toast.warning("Authentication Required", {
        description: "You need to be signed in to publish nanopublications.",
      });
      return;
    }

    if (!identity.orcid) {
      toast.warning("ORCID Required", {
        description:
          "Your account must be linked to your ORCID to publish nanopublications.",
        action: orcidLinkAction
          ? {
              label: "Link ORCID",
              onClick: orcidLinkAction,
            }
          : undefined,
      });
      return;
    }

    if (!identity.privateKey && !demoMode) {
      toast.error("No Private Key", {
        description:
          "Enter a private key in your account or use Demo Mode to sign with an example key.",
      });
      return;
    }

    // Generate/Sign
    let template;
    try {
      template = await NanopubTemplate.load(templateUri!);
    } catch (error) {
      console.error("Error generating nanopub:", error);
      toast.error("Failed to generate nanopub", {
        description:
          "An error occured while loading the template. Check your internet connection or try again later.",
      });
      return;
    }
    try {
      const signed = await template.generateNanopublication(
        data,
        {
          orcid: identity.orcid,
          name: identity.name,
          isExample: demoMode || data?.isExampleNanopub === true,
        },
        identity.privateKey || EXAMPLE_privateKey,
      );

      setGeneratedRdf(signed.signedRdf);
      setPublishedUri(signed.sourceUri);
      setPublishComplete(false);
      console.log("Generated RDF:\n", signed);

      toast.success("Nanopublication generated", {
        description: "Signed TriG generated and displayed below.",
      });
      (scrollPreviewRef?.current as any)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      console.error("Error generating nanopub:", error);
      toast.error("Failed to generate nanopub", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const publish = async () => {
    if (!generatedRdf) return;

    try {
      // publishRdf currently does not surface URI (server-dependent), so:
      // 1) publish the RDF
      // 2) keep using signed.sourceUri as the nanopub URI
      const { response } = await publishRdf(
        generatedRdf,
        publishServer, // optional override
      );
      const text = await response.text().catch(() => "");

      setPublishComplete(true);

      toast.success("Published nanopublication", {
        description: "Nanopublication was published successfully.",
      });

      if (publishedUri) {
        await onPublished?.({
          uri: publishedUri,
          signedRdf: generatedRdf,
          publishResponseText: text,
        });
        (scrollBottomRef?.current as any)?.scrollIntoView({
          behavior: "smooth",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Publishing failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className={`flex flex-col gap-6 `}>
      {!embedded && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="flex items-center text-xl text-muted-foreground font-black">
            <FilePlus className="mr-4" />
            CREATE NANOPUBLICATION
          </h1>
          {templateUri && TemplateComp && (
            <div className="flex items-center gap-2">
              <Label htmlFor="advanced-mode" className="text-sm font-medium">
                Advanced Mode
              </Label>
              <Switch
                id="advanced-mode"
                checked={isAdvancedMode}
                onCheckedChange={setIsAdvancedMode}
              />
            </div>
          )}
        </div>
      )}
      <Card>
        <CardContent>
          {templateUri ? (
            // TEMPLATE SELECTED
            <>
              {isPredefined && TemplateComp && !isAdvancedMode ? (
                <>
                  <div className="font-bold inline-flex">
                    {POPULAR_TEMPLATES[templateUri].name}{" "}
                    <a
                      href={toScienceLiveNPUri(templateUri)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-400"
                      title="View source template"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                  <div className="my-6">
                    {POPULAR_TEMPLATES[templateUri].description}
                  </div>
                  <div className="my-8 text-muted-foreground">
                    {POPULAR_TEMPLATES[templateUri].moreDescription}
                  </div>
                  <TemplateComp
                    submit={generateNanopub}
                    prefilledData={{
                      ...(prefilledData ?? {}),
                      isExampleNanopub: demoMode,
                    }}
                  />
                </>
              ) : (
                <AnyStatementTemplate
                  templateUri={templateUri}
                  submit={generateNanopub}
                  prefilledData={{
                    ...(prefilledData ?? {}),
                    isExampleNanopub: demoMode,
                  }}
                />
              )}
            </>
          ) : (
            // NO TEMPLATE SELECTED
            <>
              <h1 className="text-lg font-semibold mb-8">
                Select a Template to use
              </h1>

              <div className="gap-2 w-full md:w-auto space-y-4">
                <Label>
                  Use a predefined template:
                  <Badge variant="default">Recommended</Badge>
                </Label>{" "}
                <TemplateCombobox
                  setSelection={(value) => {
                    onTemplateUriChange?.(value);
                  }}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="m-10" htmlFor="template-uri">
                    OR...
                  </Label>
                  <Label className="my-6" htmlFor="template-uri">
                    Enter any nanopublication template URI{" "}
                    <Badge variant="secondary">Advanced</Badge>
                  </Label>
                  <Input
                    id="template-uri"
                    type="url"
                    value={inputUri ?? ""}
                    onChange={(e) => setInputUri(e.target.value)}
                    placeholder="https://w3id.org/np/..."
                    className="w-full"
                  />
                </div>
                <Button disabled={!inputUri} onClick={handleLoadCustomTemplate}>
                  Load Template
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Generated RDF display */}
      {generatedRdf && (
        <div className="mt-20 space-y-6" ref={scrollPreviewRef}>
          <h1 className="flex items-center text-xl text-muted-foreground font-black">
            PREVIEW:
          </h1>
          {previewStore ? (
            <NanopubViewer
              store={previewStore}
              creatorUserIdsByOrcid={{}}
              showShareMenu={false}
              showCitation={false}
              generatedTrig={generatedRdf}
            />
          ) : (
            <div className="text-muted-foreground p-4 text-center">
              Generating preview...
            </div>
          )}

          {publishComplete && publishedUri ? (
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-green-500 flex items-center gap-2">
                  <BookCheck /> Successfully Published
                </h3>
                <p>Your new nanopublication will soon be available at:</p>
                <a
                  href={publishedUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {publishedUri}
                </a>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="terms-checkbox"
                  checked={termsAgreed}
                  onCheckedChange={(checked) =>
                    setTermsAgreed(checked === true)
                  }
                />
                <Label
                  htmlFor="terms-checkbox"
                  className="text-sm cursor-pointer italic w-md"
                >
                  I agree to the terms and conditions, and acknowledge that once
                  published, a nanopublication is public and cannot be deleted
                  (although it can be later labelled as retracted)
                </Label>
              </div>
              <Button
                disabled={!termsAgreed || publishComplete}
                onClick={publish}
              >
                Publish
              </Button>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>
      )}
    </div>
  );
}
