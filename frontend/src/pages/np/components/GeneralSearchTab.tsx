import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isNanopubUri } from "@/lib/uri";
import { FileSymlink, Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ViewerDemo from "../ViewerDemo";

interface GeneralSearchTabProps {
  /** Called when a search or URI view is triggered */
  onAction?: () => void;
}

/**
 * GeneralSearchTab
 *
 * Tab content for general search with its own search input.
 * Handles both keyword search and nanopub URI navigation.
 */
export function GeneralSearchTab({ onAction }: GeneralSearchTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState("");

  const isNanopubInput = isNanopubUri(inputValue);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (isNanopubUri(inputValue)) {
      // It's a nanopub URI - navigate to view it
      const next = new URLSearchParams(searchParams);
      next.set("uri", inputValue);
      next.delete("q");
      setSearchParams(next);
    } else {
      // It's a search query - perform search
      const next = new URLSearchParams(searchParams);
      next.set("q", inputValue);
      next.delete("uri");
      setSearchParams(next);
    }

    onAction?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          type="text"
          className="h-12 text-lg px-6"
          placeholder="Enter search query or nanopub URI..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
        />
        <Button
          className="inline-flex items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 h-12 px-8 text-lg"
          onClick={handleSubmit}
        >
          {isNanopubInput ? (
            <>
              <FileSymlink className="h-5 w-5 mr-2" />
              View
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Go
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-muted-foreground text-sm">
        Search across the Nanopublications network or enter a nanopublication
        URI to view it
      </p>

      {/* Example links shown when idle */}
      <ViewerDemo />
    </div>
  );
}
