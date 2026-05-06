/**
 * TextImportPreviewPopover
 *
 * A popover that loads a nanopublication by URI and renders its markdown
 * content as HTML as a simplified text preview of its contents.
 */

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { NanopubStore } from "@/lib/nanopub-store";
import { Eye } from "lucide-react";
import { marked } from "marked";
import { useEffect, useState } from "react";

export function TextImportPreviewPopover({ uri }: { uri: string }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setHtml(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    NanopubStore.load(uri)
      .then((store) => {
        if (cancelled) return;
        const md = store.toMarkdownString();
        setHtml(marked.parse(md) as string);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, uri]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors shrink-0 hover:cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          title="Preview nanopub"
        >
          <Eye className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        className="w-96 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> <span>Loading preview…</span>
          </div>
        )}
        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">
            Failed to load preview: {error}
          </div>
        )}
        {html && (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
