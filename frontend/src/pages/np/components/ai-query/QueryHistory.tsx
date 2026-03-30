/**
 * Component to display and manage SPARQL query history.
 */

import { RelativeDateTime } from "@/components/relative-datetime";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import type { QueryHistoryItem } from "./types";

interface QueryHistoryProps {
  /** Array of history items to display */
  history: QueryHistoryItem[];
  /** Callback when a history item is selected to execute */
  onSelect: (item: QueryHistoryItem) => void;
  /** Callback to clear all history */
  onClear: () => void;
  /** Callback to remove a specific item */
  onRemove: (id: string) => void;
}

/**
 * Truncate query text for display.
 */
function truncateQuery(query: string, maxLength = 100): string {
  const singleLine = query.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength - 3) + "...";
}

export function QueryHistory({
  history,
  onSelect,
  onClear,
  onRemove,
}: QueryHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (history.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors data-[state=open]:[&>svg]:rotate-90">
        <ChevronRight className="h-4 w-4 transition-transform duration-100" />
        Query History ({history.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-md border bg-muted/30 p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Last {history.length} queries
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear History
            </Button>
          </div>
          <div
            className="flex flex-col gap-1 max-h-64 overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 group"
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-mono truncate"
                    title={item.query}
                  >
                    {truncateQuery(item.query)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>
                      <RelativeDateTime
                        className="text-xs"
                        date={item.timestamp}
                      />
                    </span>
                    <span>•</span>
                    <span>
                      {item.resultCount === -1
                        ? "error"
                        : `${item.resultCount} result${item.resultCount !== 1 ? "s" : ""}`}
                    </span>
                    {item.prompt && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-32" title={item.prompt}>
                          {item.prompt}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect(item)}
                    className="h-7 w-7 p-0"
                    title="Run query"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    className="h-7 w-7 p-0 hover:text-destructive"
                    title="Remove from history"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
