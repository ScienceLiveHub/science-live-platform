"use client";
import { useFormedible } from "@/hooks/use-formedible";
import {
  generateZodSchema,
  NanopubTemplate,
  templateStatementsToFormedible,
} from "@/lib/nanopub-template";
import parse from "html-react-parser";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface AnyStatementTemplateProps {
  templateUri: string;
  publish: (data: any) => Promise<void>;
  prefilledData?: any;
}

export default function AnyStatementTemplate({
  templateUri,
  publish,
  prefilledData = {},
}: AnyStatementTemplateProps) {
  const [template, setTemplate] = useState<NanopubTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    fields: [
      ...fields,
      {
        name: "isExampleNanopub",
        type: "checkbox",
        label: "Create as an Example Nanopub (for testing and demo purposes)",
        gridColumnSpan: 2,
      },
    ],
    submitLabel: "Generate Nanopublication",
    resetOnSubmitSuccess: false,
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        ...fields.reduce(
          (acc, field) => {
            acc[field.name] =
              field.defaultValue || (field.type === "array" ? [] : "");
            return acc;
          },
          {} as Record<string, any>,
        ),
        isExampleNanopub: true,
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        await publish(value);
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
      <div className="flex font-bold">
        {template.metadata.title}{" "}
        <a
          href={template.metadata.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 text-blue-600 hover:underline"
        >
          <ExternalLink />
        </a>
      </div>{" "}
      <div className="my-6">{parse(template.templateMetadata.description)}</div>{" "}
      {/* Dynamic form */}
      <Form />
    </div>
  );
}
