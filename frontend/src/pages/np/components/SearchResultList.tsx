import { NanopubIcon } from "@/components/nanopub-icon";
import { RelativeDateTime } from "@/components/relative-datetime";
import { AsyncLabel } from "@/hooks/use-labels";
import { toScienceLiveNPUri } from "@/lib/uri";
import { FileSymlink } from "lucide-react";
import { Link } from "react-router-dom";

export interface SearchResult {
  np: string;
  label: string;
  date: Date;
  creator: string;
  isExample?: boolean;
  maxScore?: number;
  referenceCount?: number;
}

export default function SearchResultList({
  searchResults,
}: {
  searchResults: SearchResult[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {searchResults.map((result, index) => (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          {/* Label/Title */}
          <Link
            key={result.np || index}
            to={toScienceLiveNPUri(result.np)}
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            <div className="font-medium flex flex-row">
              <NanopubIcon className="w-3 h-3 min-w-3 min-h-3 mt-1.5 mr-2" />
              {result.label || "Untitled Nanopublication"}
            </div>
          </Link>

          {/* Author */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs truncate">
              By <AsyncLabel uri={result.creator} link />
            </span>
          </div>

          {/* Date */}
          {result.date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RelativeDateTime date={result.date} />
              {!!result.referenceCount && (
                <>
                  •{" "}
                  <FileSymlink size={15}>
                    {" "}
                    <title>Number of other nanopubs linking to this one</title>
                  </FileSymlink>
                  {result.referenceCount}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
