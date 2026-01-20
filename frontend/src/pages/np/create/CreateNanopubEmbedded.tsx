"use client";

// NOTE: This file is imported by the Zotero plugin build (outside the frontend Vite alias context),
// so avoid using the "@/" path alias here.
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { Label } from "../../../components/ui/label";
import { NanopubTemplate } from "../../../lib/nanopub-template";
import { publishRdf } from "../../../lib/rdf";
import AnyStatementTemplate from "./components/AnyStatementTemplate";

export type EmbeddedPublisherProfile = {
  name: string;
  orcid: string; // full ORCID URI
  privateKey: string;
};

export default function CreateNanopubEmbedded(props: {
  templateUri: string;
  profile: EmbeddedPublisherProfile;
  // Override publish server (defaults to Knowledge Pixels registry)
  publishServer?: string;
  // Optional hook for host app (e.g. Zotero) to intercept the final published URI
  onPublished?: (args: {
    uri: string;
    signedRdf: string;
    publishResponseText?: string;
  }) => void | Promise<void>;
  prefilledData?: any;
}) {
  const { templateUri, profile, publishServer, onPublished, prefilledData } =
    props;

  const [generatedRdf, setGeneratedRdf] = useState<string>("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [publishComplete, setPublishComplete] = useState(false);
  const [publishedUri, setPublishedUri] = useState<string>("");

  const generateNanopub = async (data: any) => {
    try {
      const template = await NanopubTemplate.load(templateUri);
      const signed = await template.applyTemplate(
        data,
        {
          orcid: profile.orcid,
          name: profile.name,
          isExample: data?.isExampleNanopub === true,
        },
        profile.privateKey,
      );

      setGeneratedRdf(signed.signedRdf);
      setPublishedUri(signed.sourceUri);
      setPublishComplete(false);

      toast.success("Nanopublication generated", {
        description: "Signed TriG generated and displayed below.",
      });
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template", {
        description:
          error instanceof Error
            ? error.message
            : ((error as any)?.toString() ?? "Unknown error"),
      });
    }
  };

  const doPublish = async () => {
    try {
      // publishRdf currently does not surface URI (server-dependent), so:
      // 1) publish the RDF
      // 2) keep using signed.sourceUri as the nanopub URI
      const { response } = await publishRdf(
        generatedRdf,
        publishServer ?? "https://registry.knowledgepixels.com/",
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
      }
    } catch (error) {
      console.error(error);
      toast.error("Publishing failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <AnyStatementTemplate
        templateUri={templateUri}
        publish={generateNanopub}
        prefilledData={prefilledData}
      />

      {generatedRdf && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">
            Nanopublication (TRIG format)
          </h3>

          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              <code>{generatedRdf}</code>
            </pre>
          </div>

          <div className="flex flex-col items-end gap-3">
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
              onClick={doPublish}
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
    </div>
  );
}
