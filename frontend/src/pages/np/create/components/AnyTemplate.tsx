"use client";
import { useFormedible } from "@/hooks/use-formedible";
import {
  generateZodSchema,
  NanopubTemplate,
  templateFieldsToFormedible,
} from "@/lib/nanopub-template";
import parse from "html-react-parser";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface DynamicTemplateProps {
  templateUri: string;
}

export default function AnyTemplate({ templateUri }: DynamicTemplateProps) {
  const [template, setTemplate] = useState<NanopubTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      if (!templateUri) return;

      try {
        setLoading(true);
        setError(null);

        await NanopubTemplate.load(templateUri, setTemplate);
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
    return template ? templateFieldsToFormedible(template?.fields) : [];
  }, [template]);

  const schema = template
    ? generateZodSchema(template.fields)
    : generateZodSchema([]);

  const { Form } = useFormedible({
    schema,
    fields,
    submitLabel: "Publish Nanopublication",
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

        toast.info("This is only a Demo!", {
          description:
            "Dynamic template parsing works! Publishing features coming soon.",
        });
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
      <div className="border rounded-lg p-6 bg-muted/20">
        <h2 className="text-xl font-semibold mb-2">
          {template.metadata.title}
        </h2>
        {template.description && (
          <p className="text-muted-foreground mb-4">
            {parse(template.description)}
          </p>
        )}
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
      </div>

      {/* Dynamic form */}
      <Form />
    </div>
  );
}
