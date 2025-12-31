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
import { authClient } from "@/lib/auth-client";
import { NanopubTemplate } from "@/lib/nanopub-template";
import { EXAMPLE_privateKey } from "@/lib/utils";
import ky from "ky";
import { ChevronsUpDown, FilePlus } from "lucide-react";
import { publish } from "nanopub-js";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AnyStatementTemplate from "./components/AnyStatementTemplate";
import { POPULAR_TEMPLATES } from "./components/templates/registry";

export function Combobox({
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

export default function CreateNanopub() {
  const [selected, setSelected] = useState("");
  const [inputUri, setInputUri] = useState("");
  const [activeUri, setActiveUri] = useState("");
  // TODO: we hardcode it to advanced mode for now until "friendly UX" is implemented
  const [isAdvancedMode, setIsAdvancedMode] = useState(true);
  const [generatedRdf, setGeneratedRdf] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [publishComplete, setPublishComplete] = useState(false);
  const [publishedUri, setPublishedUri] = useState<string>("");

  const [searchParams, setSearchParams] = useSearchParams();

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: session, error: sessionError } =
          await authClient.getSession();

        if (sessionError || !session?.user) {
          console.log("No user session found");
          return;
        }

        // Fetch current user's full profile data including ORCID
        const response = await ky(
          `${import.meta.env.VITE_API_URL}/user-profile/${session.user.id}`,
        );

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error loading current user data:", error);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    const templateUri = searchParams.get("template") || "";
    if (!templateUri) {
      // No template query param -> return to selection view
      setSelected("");
      setActiveUri("");
      setInputUri("");
      return;
    }

    if (POPULAR_TEMPLATES[templateUri]) {
      // Predefined template selected via query param
      setSelected(templateUri);
      setActiveUri("");
      setInputUri("");
    } else {
      // Custom template URI via query param
      setSelected("");
      setActiveUri(templateUri);
      setInputUri(templateUri);
    }
  }, [searchParams]);

  const handleLoadTemplate = () => {
    const uri = inputUri.trim();
    if (!uri) {
      toast.error("Please enter a template URI");
      return;
    }
    setSelected("");
    setActiveUri(uri);
    const next = new URLSearchParams(searchParams);
    next.set("template", uri);
    setSearchParams(next);
  };
  const reset = () => {
    setActiveUri("");
    setInputUri("");
    setSelected("");
    const next = new URLSearchParams(searchParams);
    next.delete("template");
    setSearchParams(next);
  };
  const Comp = POPULAR_TEMPLATES[selected]?.component;

  const publishNanopub = async (data: any) => {
    console.log("Data entered:", data);

    // Check if user is signed in
    if (!currentUser) {
      toast.error("Authentication Required", {
        description: "You need to be signed in to publish nanopublications.",
      });
      return;
    }

    // Check if user has ORCID linked
    if (!currentUser.orcidConnected || !currentUser.orcidId) {
      toast.error("ORCID Required", {
        description:
          "You need to link your ORCID account in user settings to publish nanopublications.",
      });
      return;
    }

    let template: NanopubTemplate;
    try {
      template = await NanopubTemplate.load(selected);

      // Apply template to generate RDF
      if (template) {
        const signed = await template.applyTemplate(
          data,
          {
            orcid: currentUser.orcidId,
            name: currentUser.name,
            isExample: true, //TODO: remove hardcode
          },
          EXAMPLE_privateKey, //TODO: remove hardcode. Either use the crypto library or nanopub-js generateKeys()
        );
        setGeneratedRdf(signed.signedRdf);
        setPublishedUri(signed.sourceUri);
        setPublishComplete(false);
        console.log("Generated RDF:\n", signed);

        toast.success("Template applied successfully!", {
          description: "RDF generated and displayed below.",
        });
      }
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }

    toast.info("This is only a Demo!", {
      description: "Publishing features coming soon.",
    });
  };

  return (
    <main className="container mx-auto flex grow flex-col gap-6 p-4 md:p-6 md:max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="flex items-center text-xl text-muted-foreground font-black">
          <FilePlus className="mr-4" />
          CREATE NANOPUBLICATION
        </h1>
        {selected && false && Comp && (
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
      <Card>
        <CardContent>
          {selected && Comp ? (
            <>
              {isAdvancedMode ? (
                <AnyStatementTemplate
                  templateUri={selected}
                  publish={publishNanopub}
                />
              ) : (
                <>
                  <div className="font-bold">
                    {POPULAR_TEMPLATES[selected].name}{" "}
                  </div>{" "}
                  <div className="my-6">
                    {POPULAR_TEMPLATES[selected].description}
                  </div>{" "}
                  <Comp publish={publishNanopub} />
                </>
              )}
            </>
          ) : activeUri ? (
            <>
              <AnyStatementTemplate
                templateUri={activeUri}
                publish={publishNanopub}
              />
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold mb-8">
                Select a Template to use
              </h1>

              <div className="gap-2 w-full md:w-auto space-y-4">
                <Label>
                  Use a predefined template:
                  <Badge variant="default">Recommended</Badge>
                </Label>{" "}
                <Combobox
                  setSelection={(value) => {
                    setSelected(value);
                    setActiveUri("");
                    setInputUri("");
                    const next = new URLSearchParams(searchParams);
                    next.set("template", value);
                    setSearchParams(next);
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
                    value={inputUri}
                    onChange={(e) => setInputUri(e.target.value)}
                    placeholder="https://w3id.org/np/..."
                    className="w-full"
                  />
                </div>
                <Button disabled={!inputUri} onClick={handleLoadTemplate}>
                  Load Template
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Generated RDF display */}
      {generatedRdf && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            Nanopublication (TRIG format)
          </h3>
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              <code>{generatedRdf}</code>
            </pre>
          </div>
          <div className="mt-4 flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="terms-checkbox"
                checked={termsAgreed}
                onCheckedChange={(checked) => setTermsAgreed(checked === true)}
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
              onClick={async () => {
                try {
                  const result = await publish(
                    generatedRdf,
                    EXAMPLE_privateKey,
                    currentUser.orcidId,
                    currentUser.name,
                  );
                  setPublishComplete(true);
                  toast.success(
                    "Published as an EXAMPLE nanopub.  A link to it will soon be available on your profile page.",
                  ); // TODO: hardcoded as example
                } catch {
                  toast.error("Something went wrong");
                }
              }}
            >
              Publish
            </Button>
            {publishComplete && publishedUri && (
              <a
                href={publishedUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {publishedUri}
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
