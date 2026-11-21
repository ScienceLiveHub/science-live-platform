/**
 * ViewUserStory
 *
 * User-friendly view for nanopubs created with the FAIR2Adapt "User Story" template
 * (`RACciFqZ…`). Reads as the story it is:
 *
 *   F2A CS2 US4
 *   As a: researcher
 *   I want to: use model outputs
 *   So that: I can compute indicators
 *
 * followed by the domains it covers, the risks it faces, the sectors exposed to them
 * and the digital object types it calls for. Reads both the template's `fff:`
 * vocabulary and the `fff/req/` one the FIP wizard publishes.
 */

import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { useEffect, useMemo, useState } from "react";
import {
  getTemplateBorderClass,
  getTemplateColorClass,
  TEMPLATE_METADATA,
  TEMPLATE_URI,
} from "../create/components/templates/registry-metadata";
import { USER_STORY_DOMAIN_OPTIONS } from "../create/components/templates/user-story-terms";
import { CustomViewerProps } from "./NanopubViewer";
import { TermBadgeList } from "./shared-components";
import { extractUserStory } from "./user-story-data";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

/** Labels of the template's fixed domain list, which the domain URIs do not carry */
function useDomainLabels(needed: boolean) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!needed) return;
    let cancelled = false;
    fetchPossibleValuesFromQuads(USER_STORY_DOMAIN_OPTIONS)
      .then((options) => {
        if (cancelled) return;
        setLabels(
          Object.fromEntries(options.map((o) => [o.name, o.description])),
        );
      })
      .catch((e) => console.warn("Failed to load domain labels:", e));
    return () => {
      cancelled = true;
    };
  }, [needed]);
  return labels;
}

export function ViewUserStory({ store }: CustomViewerProps) {
  const data = useMemo(() => extractUserStory(store), [store]);
  const { resolvedTheme } = useTheme();
  const { getLabel } = useLabels();
  const domainLabels = useDomainLabels(!!data?.domains.length);

  if (!data) return null;

  const Icon = TEMPLATE_VIEW_ICONS[TEMPLATE_URI.USER_STORY];
  const color = TEMPLATE_METADATA[TEMPLATE_URI.USER_STORY].color!;

  // Labels picked from an API are recorded in the pubinfo (nt:hasLabelFromApi)
  const labelOf = (uri: string) =>
    domainLabels[uri] || store.findInternalLabel(uri) || getLabel(uri);

  const parts = [
    ["As a", data.asA],
    ["I want to", data.iWantTo],
    ["So that", data.soThat],
  ].filter(([, text]) => text);

  const terms: [string, string[]][] = [
    ["Domains", data.domains],
    ["Risks", data.challenges],
    ["Exposed sectors", data.exposed],
    ["Digital object types", data.digitalObjectTypes],
  ];

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          User Story
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold mb-3">{data.title}</h3>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-base">
            {parts.map(([part, text]) => (
              <div key={part} className="contents">
                <dt className="font-medium text-muted-foreground">{part}:</dt>
                <dd className="whitespace-pre-line">{text}</dd>
              </div>
            ))}
          </dl>
        </div>

        {terms.some(([, uris]) => uris.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {terms.map(([title, uris]) => (
              <TermBadgeList
                key={title}
                title={title}
                uris={uris}
                labelOf={labelOf}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
