import { NanopubIcon } from "@/components/nanopub-icon";
import { RelativeDateTime } from "@/components/relative-datetime";
import { AsyncLabel } from "@/hooks/use-labels";
import { toScienceLiveNPUri } from "@/lib/uri";
import {
  FEED_GROUPS,
  FEED_TEMPLATE_LABELS,
  type FeedResult,
  type FeedTemplateKey,
  useFeed,
} from "@/pages/feed/use-feed";
import { Check, Loader2, Minus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TEMPLATE_METADATA } from "../create/components/templates/registry-metadata";
import { TEMPLATE_VIEW_ICONS } from "../view/view-registry";

/** Initial checked state for each template key — false means unchecked */
const INITIAL_CHECKED: Record<FeedTemplateKey, boolean> = {
  AIDA_SENTENCE: true,
  CITATION_CITO: true,
  ANNOTATE_QUOTATION: false,
  COMMENT_PAPER: false,
  GEO_COVERAGE: false,
  DATASET: false,
  RESEARCH_SOFTWARE: false,
  PICO_RESEARCH_QUESTION: true,
  PCC_RESEARCH_QUESTION: true,
  PRISMA_SEARCH_STRATEGY: true,
  PRISMA_DATABASE_SEARCH: false,
  PRISMA_SEARCH_EXECUTION_DATASET: false,
  PRISMA_STUDY_INCLUSION: false,
  PRISMA_STUDY_ASSESSMENT: false,
  PRISMA_FULL_SCREENING: false,
  FORRT_CLAIM: false,
  FORRT_REPLICATION: false,
  FORRT_REPLICATION_OUTCOME: true,
  FORRT_KL_REPLICATION: false,
  FORRT_KL_REPLICATION_OUTCOME: true,
};

export function LatestFeed() {
  const [checked, setChecked] =
    useState<Record<FeedTemplateKey, boolean>>(INITIAL_CHECKED);

  const selected = useMemo(() => {
    const s = new Set<FeedTemplateKey>();
    for (const [key, val] of Object.entries(checked)) {
      if (val) s.add(key as FeedTemplateKey);
    }
    return s;
  }, [checked]);

  const { results, loading, error } = useFeed(selected);

  const toggle = useCallback((key: FeedTemplateKey) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleGroup = useCallback((keys: FeedTemplateKey[]) => {
    setChecked((prev) => {
      const allOn = keys.every((k) => prev[k]);
      const next = { ...prev };
      for (const k of keys) {
        next[k] = !allOn;
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sidebar: template filters */}
      <aside className="flex w-full flex-col gap-4 lg:w-64 lg:min-w-64">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by template
        </h2>
        {FEED_GROUPS.map((group) => {
          const allOn = group.keys.every((k) => checked[k]);
          const someOn = !allOn && group.keys.some((k) => checked[k]);
          return (
            <div key={group.label} className="flex flex-col gap-1.5">
              <label
                className="flex cursor-pointer items-center gap-2 text-left select-none"
                onClick={() => toggleGroup(group.keys)}
              >
                <FeedCheckbox
                  state={
                    allOn ? "checked" : someOn ? "indeterminate" : "unchecked"
                  }
                />
                <span className="text-sm font-medium">{group.label}</span>
              </label>
              <div className="ml-6 flex flex-col gap-1">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-sm font-normal select-none"
                    onClick={() => toggle(key)}
                  >
                    <FeedCheckbox
                      state={checked[key] ? "checked" : "unchecked"}
                    />
                    {FEED_TEMPLATE_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </aside>

      {/* Results */}
      <section className="flex-1">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}
        {!loading && !error && selected.size === 0 && (
          <p className="text-sm text-muted-foreground">
            Select at least one template type to see results.
          </p>
        )}
        {!loading && !error && selected.size > 0 && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No nanopublications found for the selected templates.
          </p>
        )}
        {!loading && results.length > 0 && <FeedResultList results={results} />}
      </section>
    </div>
  );
}

function FeedCheckbox({
  state,
}: {
  state: "checked" | "unchecked" | "indeterminate";
}) {
  return (
    <span
      className={`flex size-4 shrink-0 items-center justify-center rounded-lg border shadow-xs ${
        state === "unchecked"
          ? "border-input dark:bg-input/30"
          : "border-primary bg-primary text-primary-foreground"
      }`}
    >
      {state === "checked" && <Check className="size-3.5" />}
      {state === "indeterminate" && <Minus className="size-3.5" />}
    </span>
  );
}

function FeedResultList({ results }: { results: FeedResult[] }) {
  return (
    <div className="flex flex-col gap-3">
      {results.map((r, i) => {
        const displayLabel = r.description || r.label;
        const Icon = r.template && TEMPLATE_VIEW_ICONS[r.template];
        const color = r.template && TEMPLATE_METADATA[r.template]?.color;
        return (
          <div
            key={r.np || i}
            className="flex flex-col gap-2 rounded-lg border bg-card p-4"
          >
            <Link
              to={toScienceLiveNPUri(r.np)}
              className={`hover:underline ${color ? `text-${color}-600` : "text-primary"}`}
            >
              <div className="font-medium flex flex-row">
                {r.template &&
                  TEMPLATE_METADATA[r.template] &&
                  (Icon ? (
                    <Icon className="w-4 h-4 min-w-4 min-h-4 mt-1 mr-2" />
                  ) : (
                    <NanopubIcon className="w-3 h-3 min-w-3 min-h-3 mt-1.5 mr-2" />
                  ))}
                {displayLabel || "Untitled Nanopublication"}
              </div>
            </Link>
            {r.description && r.label && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {r.label}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs truncate">
                By <AsyncLabel uri={r.creator} link />
              </span>
            </div>
            {r.date && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RelativeDateTime date={new Date(r.date)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
