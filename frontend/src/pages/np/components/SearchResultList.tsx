import { NanopubIcon } from "@/components/nanopub-icon";
import { RelativeDateTime } from "@/components/relative-datetime";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { AsyncLabel } from "@/hooks/use-labels";
import { getUriEnd, toScienceLiveNPUri } from "@/lib/uri";
import { FilePlus, FileSymlink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getTemplateColorClass,
  getTemplateMetadata,
  resolveTemplateUri,
} from "../create/components/templates/registry-metadata";
import { TEMPLATE_VIEW_ICONS } from "../view/view-registry";

export interface SearchResult {
  np: string;
  label: string;
  date: Date;
  creator: string;
  types?: string[];
  template?: string;
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
            className="hover:underline"
          >
            <div className="font-medium flex flex-row">
              {result.types?.includes(
                "https://w3id.org/np/o/ntemplate/AssertionTemplate",
              ) ? (
                <FilePlus className="w-4 h-4 min-w-4 min-h-4 mt-1 mr-2 text-purple-400 dark:text-purple-300" />
              ) : (
                <NanopubTemplateIcon template={result.template} />
              )}

              {result.label || "Untitled Nanopublication"}
            </div>
          </Link>

          {/* Author */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs truncate">
              By <AsyncLabel uri={result.creator} link />
            </span>
          </div>

          {/* Type badges */}
          {result.types && result.types.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {result.types.map((type) => (
                <span key={type} className="text-xs truncate">
                  <a href={type}>
                    <Badge variant="outline" className="text-xs h-6 px-2 gap-1">
                      {getUriEnd(type)}
                    </Badge>
                  </a>
                </span>
              ))}
            </div>
          )}

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

export function NanopubTemplateIcon({ template }: { template?: string }) {
  const { resolvedTheme } = useTheme();
  const resolved = template && resolveTemplateUri(template);
  const Icon = resolved ? TEMPLATE_VIEW_ICONS[resolved] : undefined;
  const color = template && getTemplateMetadata(template)?.color;
  return Icon ? (
    <Icon
      className={`w-4 h-4 min-w-4 min-h-4 mt-1 mr-2 ${getTemplateColorClass(color, resolvedTheme)}`}
    />
  ) : (
    <NanopubIcon className="w-3 h-3 min-w-3 min-h-3 mt-1.5 mr-2 text-link" />
  );
}
