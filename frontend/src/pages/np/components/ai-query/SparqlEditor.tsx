/**
 * SPARQL query editor component with copy functionality.
 */

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { Check, Copy, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";

interface SparqlEditorProps {
  /** The SPARQL query content */
  value: string;
  /** Callback when the query is edited */
  onChange?: (value: string) => void;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
  /** Whether the editor is in a loading state */
  loading?: boolean;
  /** The original generated query (for reset functionality) */
  originalQuery?: string;
  /** Additional class names */
  className?: string;
}

export function SparqlEditor({
  value,
  onChange,
  readOnly = false,
  loading = false,
  originalQuery,
  className,
}: SparqlEditorProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy query:", err);
    }
  }, [value]);

  const handleReset = useCallback(() => {
    if (originalQuery && onChange) {
      onChange(originalQuery);
    }
  }, [originalQuery, onChange]);

  const handleChange = useCallback(
    (value: string) => {
      if (onChange) {
        onChange(value);
      }
    },
    [onChange],
  );

  // Count lines and characters
  const lineCount = value.split("\n").length;
  const charCount = value.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          SPARQL Query
          {readOnly && <span className="ml-2">(read-only)</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Reset button - only show if edited and original exists */}
          {originalQuery &&
            value !== originalQuery &&
            onChange &&
            !readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={loading}
                title="Reset to generated query"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="ml-1 sr-only">Reset</span>
              </Button>
            )}
          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={loading || !value}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-1 sr-only">Copy</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <CodeEditor
          value={value}
          language="sparql"
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          disabled={loading}
          placeholder="SPARQL query will appear here..."
          className={cn(
            "min-h-50 resize-y rounded-md border border-input",
            "bg-muted/30 dark:bg-muted/20 font-mono text-md",
            readOnly && "cursor-default",
            loading && "opacity-50",
          )}
          data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
          spellCheck={false}
          padding={10}
          style={{
            fontFamily:
              "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
          }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="text-sm text-muted-foreground">
              Generating query...
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <span>{lineCount} lines</span>
        <span>{charCount.toLocaleString()} characters</span>
      </div>
    </div>
  );
}
