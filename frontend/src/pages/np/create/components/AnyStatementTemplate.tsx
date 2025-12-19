"use client";
import { useFormedible } from "@/hooks/use-formedible";
import {
  generateZodSchema,
  NanopubTemplate,
  templateStatementsToFormedible,
} from "@/lib/nanopub-template";
import parse from "html-react-parser";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface DynamicTemplateProps {
  templateUri: string;
}

export default function AnyStatementTemplate({
  templateUri,
}: DynamicTemplateProps) {
  const [template, setTemplate] = useState<NanopubTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRdf, setGeneratedRdf] = useState<string>("");

  useEffect(() => {
    async function loadTemplate() {
      if (!templateUri || loading) return;

      try {
        setLoading(true);
        setError(null);

        setTemplate(await NanopubTemplate.load(templateUri));
      } catch (err) {
        console.error("Failed to load template:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load template",
        );
        toast.error("Failed to load nanopub template");
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [templateUri]);

  const fields = useMemo(() => {
    return template
      ? templateStatementsToFormedible(template?.fields, template?.statements)
      : [];
  }, [template]);

  const schema = template
    ? generateZodSchema(template.fields)
    : generateZodSchema([]);

  const { Form } = useFormedible({
    schema,
    layout: { type: "grid", columns: 3 },
    fields,
    submitLabel: "Publish",
    resetOnSubmitSuccess: false,
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: fields.reduce(
        (acc, field) => {
          acc[field.name] =
            field.defaultValue || (field.type === "array" ? [] : "");
          return acc;
        },
        {} as Record<string, any>,
      ),
      onSubmit: async ({ value }) => {
        console.log("Dynamic template submitted:", value);
        console.log("Template URI:", templateUri);
        console.log(
          "Template metadata:",
          template
            ? {
                name: template.metadata.title,
                description: template.description,
                fields: template.fields,
              }
            : null,
        );

        try {
          // Apply template to generate RDF
          if (template) {
            const rdfString = await template.applyTemplate(value, {
              orcid: "0000-0000-0000-0000", // TODO: Get from user session
              name: "Test User", // TODO: Get from user session
            });
            setGeneratedRdf(rdfString);
            console.log("Generated RDF:", rdfString);

            toast.success("Template applied successfully!", {
              description: "RDF generated and displayed below.",
            });
          }
        } catch (error) {
          console.error("Error applying template:", error);
          toast.error("Failed to apply template", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    },
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading template...</span>
      </div>
    );
  }

  // Show error state
  if (error || !template) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">Error loading template</div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template header */}
      <div className="font-bold">{template.metadata.title} </div>{" "}
      <div className="my-6">{parse(template.description)}</div>{" "}
      <div className="text-sm text-muted-foreground">
        <strong>Template URI:</strong>
        <a
          href={template.metadata.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-blue-600 hover:underline"
        >
          {template.metadata.uri}
        </a>
      </div>
      {/* Dynamic form */}
      <Form />
      {/* Generated RDF display */}
      {generatedRdf && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            Generated RDF (TRIG format)
          </h3>
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              <code>{generatedRdf}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
