/**
 * TemplateFilterSidebar
 *
 * Sidebar component for filtering nanopublications by template type.
 * The resolvedTheme is passed in, enabling use in environments that are not
 * compatible with the normal useTheme hook.
 *
 * Notifies the parent via `onSelectedTemplatesChange` whenever the selection changes
 * (so the parent can e.g. reset the page).
 *
 * NOTE: the parent is notified only from user-interaction handlers (toggle /
 * clear), NOT from an effect that runs on mount. Calling the parent's
 * change-handler on mount would (in `GeneralSearch`) trigger a `resetPage()`
 * which strips `?page=N` from the URL on direct/deep links — breaking
 * pagination. A `useEffect`/`useRef` "skip initial mount" guard does not
 * survive React Strict Mode's intentional mount→unmount→remount cycle in dev,
 * so we deliberately avoid that pattern here.
 */

import { NanopubIcon } from "@/components/nanopub-icon";
import {
  FEED_GROUPS,
  FEED_TEMPLATE_LABELS,
  type FeedTemplateKey,
  getTemplateColorClass,
  TEMPLATE_METADATA,
  TEMPLATE_URI,
} from "@/pages/np/create/components/templates/registry-metadata";
import { TEMPLATE_VIEW_ICONS } from "@/pages/np/view/view-registry";
import { FilterX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FilterCheckbox, INITIAL_CHECKED } from "./SearchBar";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TemplateFilterSidebarProps {
  /** Resolved theme ("light" or "dark"), used for template icon coloring. */
  resolvedTheme: "light" | "dark";
  /** Called whenever the set of selected template keys changes. */
  onSelectedTemplatesChange: (selected: Set<FeedTemplateKey>) => void;
  /** Additional className for the aside element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Set<FeedTemplateKey> from a `checked` record. */
function buildSelectedSet(
  checked: Record<FeedTemplateKey, boolean>,
): Set<FeedTemplateKey> {
  const s = new Set<FeedTemplateKey>();
  for (const [key, val] of Object.entries(checked)) {
    if (val) s.add(key as FeedTemplateKey);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateFilterSidebar({
  resolvedTheme,
  onSelectedTemplatesChange,
  className = "",
}: TemplateFilterSidebarProps) {
  const [checked, setChecked] =
    useState<Record<FeedTemplateKey, boolean>>(INITIAL_CHECKED);

  const selectedTemplates = useMemo(() => buildSelectedSet(checked), [checked]);

  /**
   * Update `checked` and synchronously notify the parent of the new selection.
   * We do NOT use a useEffect for the notification because that would fire on
   * mount (including Strict Mode remount), causing the parent to reset
   * pagination on every page load.
   */
  const updateChecked = useCallback(
    (
      updater: (
        prev: Record<FeedTemplateKey, boolean>,
      ) => Record<FeedTemplateKey, boolean>,
    ) => {
      setChecked((prev) => {
        const next = updater(prev);
        onSelectedTemplatesChange(buildSelectedSet(next));
        return next;
      });
    },
    [onSelectedTemplatesChange],
  );

  const toggleTemplate = useCallback(
    (key: FeedTemplateKey) => {
      updateChecked((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [updateChecked],
  );

  const clearFilters = useCallback(() => {
    updateChecked((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as FeedTemplateKey[]) {
        next[key] = false;
      }
      return next;
    });
  }, [updateChecked]);

  const toggleGroup = useCallback(
    (keys: FeedTemplateKey[]) => {
      updateChecked((prev) => {
        const allOn = keys.every((k) => prev[k]);
        const next = { ...prev };
        for (const k of keys) {
          next[k] = !allOn;
        }
        return next;
      });
    },
    [updateChecked],
  );

  return (
    <aside
      className={`flex w-full flex-col gap-4 lg:w-64 lg:min-w-64 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Filter by template
        </h2>
        {selectedTemplates.size > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
      {FEED_GROUPS.map((group) => {
        const allOn = group.keys.every((k) => checked[k]);
        const someOn = !allOn && group.keys.some((k) => checked[k]);
        return (
          <div key={group.label} className="flex flex-col gap-1.5">
            <label
              className="flex cursor-pointer items-center gap-2 text-left select-none"
              onClick={() => toggleGroup(group.keys)}
            >
              <FilterCheckbox
                state={
                  allOn ? "checked" : someOn ? "indeterminate" : "unchecked"
                }
              />
              <span className="text-sm font-medium">{group.label}</span>
            </label>
            <div className="ml-6 flex flex-col gap-1">
              {group.keys.map((key) => {
                const templateUri = TEMPLATE_URI[key];
                const Icon = TEMPLATE_VIEW_ICONS[templateUri];
                const color = TEMPLATE_METADATA[templateUri]?.color;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-sm font-normal select-none"
                    onClick={() => toggleTemplate(key)}
                  >
                    <FilterCheckbox
                      state={checked[key] ? "checked" : "unchecked"}
                    />
                    {Icon ? (
                      <Icon
                        className={`w-3.5 h-3.5 min-w-3.5 min-h-3.5 ${getTemplateColorClass(color, resolvedTheme)}`}
                      />
                    ) : (
                      <NanopubIcon className="w-2.5 h-2.5 min-w-2.5 min-h-2.5 text-muted-foreground" />
                    )}
                    {FEED_TEMPLATE_LABELS[key]}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
