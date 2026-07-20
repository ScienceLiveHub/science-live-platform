/**
 * ViewResearchSoftware
 *
 * User-friendly view for nanopubs created with the "Research Software" template.
 * Displays software title, repository, supporting publications, and related resources.
 */

import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import {
  ExternalLink,
  FileText,
  FlaskConical,
  FolderGit2,
  Link2,
  Scale,
} from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import {
  TEMPLATE_METADATA,
  TEMPLATE_URI,
  getTemplateBorderClass,
  getTemplateColorClass,
} from "../create/components/templates/registry-metadata";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

const { namedNode } = DataFactory;

// Namespaces. schema.org appears as both http and https in nanopubs (the
// Research Software template uses https), so match either form.
const DCMITYPE_SOFTWARE = "http://purl.org/dc/dcmitype/Software";
const SCHEMA_MAINTAINER = [
  "https://schema.org/maintainer",
  "http://schema.org/maintainer",
];
const SCHEMA_RESULT = ["https://schema.org/result", "http://schema.org/result"];
const SKOS_RELATED = "http://www.w3.org/2004/02/skos/core#related";
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";
const DCT_TITLE = "http://purl.org/dc/terms/title";
const DCT_LICENSE = "http://purl.org/dc/terms/license";
const CITO_SUPPORTS = "http://purl.org/spar/cito/supports";

// --- Research Software extraction -----------------------------------------

interface ResearchSoftwareData {
  /** The software title */
  title: string;
  /** The software URI */
  softwareUri: string;
  /** Repository/maintainer URL (e.g., GitHub) */
  repository?: string;
  /** Research project (schema:result) this software was produced for */
  project?: string;
  /** Parent project/collection this software is part of */
  partOf?: string;
  /** License of the software (dct:license) — distinct from the nanopub's own license */
  license?: string;
  /** Supporting publication DOIs */
  supportingPublications: string[];
  /** Related resources */
  relatedResources: string[];
}

function extractResearchSoftware(
  store: NanopubStore,
): ResearchSoftwareData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the software: subject with rdf:type dcmitype:Software
  const softwareTypeQuad = store.matchOne(
    null,
    NS.RDF("type"),
    namedNode(DCMITYPE_SOFTWARE),
    assertionGraph,
  );

  if (!softwareTypeQuad) return null;

  const softwareUri = softwareTypeQuad.subject.value;
  const softwareNode = namedNode(softwareUri);

  // Get title
  const titleQuad = store.matchOne(
    softwareNode,
    namedNode(DCT_TITLE),
    null,
    assertionGraph,
  );
  const title =
    titleQuad?.object.value ||
    store.findInternalLabel(softwareUri) ||
    softwareUri;

  // First object of the software subject under any of the given predicates.
  const firstObject = (predicates: string[]): string | undefined => {
    for (const p of predicates) {
      const q = store.matchOne(
        softwareNode,
        namedNode(p),
        null,
        assertionGraph,
      );
      if (q) return q.object.value;
    }
    return undefined;
  };

  // Get repository/maintainer (schema:maintainer, http or https)
  const repository = firstObject(SCHEMA_MAINTAINER);

  // Get the research project the software was produced for (schema:result)
  const project = firstObject(SCHEMA_RESULT);

  // Get the software license (dct:license) — the license OF the software,
  // which is distinct from the nanopublication's own license (in pubinfo).
  const license = firstObject([DCT_LICENSE]);

  // Get partOf (parent project/collection)
  const partOf = firstObject([DCT_IS_PART_OF]);

  // Get supporting publications (cito:supports)
  const supportsQuads = store.getQuads(
    softwareNode,
    namedNode(CITO_SUPPORTS),
    null,
    assertionGraph,
  );
  const supportingPublications = supportsQuads
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => q.object.value);

  // Get related resources (skos:related)
  const relatedQuads = store.getQuads(
    softwareNode,
    namedNode(SKOS_RELATED),
    null,
    assertionGraph,
  );
  const relatedResources = relatedQuads
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => q.object.value);

  return {
    title,
    softwareUri,
    repository,
    project,
    partOf,
    license,
    supportingPublications,
    relatedResources,
  };
}

/**
 * Formats a URL for display (extracts domain + path for readability)
 */
function formatUrlForDisplay(url: string): string {
  try {
    const parsed = new URL(url);
    // For GitHub, show the repo path
    if (parsed.hostname === "github.com") {
      return `github.com${parsed.pathname}`;
    }
    // For DOIs, keep the full identifier
    if (
      url.startsWith("https://doi.org/") ||
      url.startsWith("http://doi.org/")
    ) {
      return url.replace(/^https?:\/\//, "");
    }
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
}

export function ViewResearchSoftware({ store }: CustomViewerProps) {
  const data = useMemo(() => extractResearchSoftware(store), [store]);
  const { resolvedTheme } = useTheme();
  const { getLabel } = useLabels();

  if (!data) return null;

  const Icon = TEMPLATE_VIEW_ICONS[TEMPLATE_URI.RESEARCH_SOFTWARE];
  const color = TEMPLATE_METADATA[TEMPLATE_URI.RESEARCH_SOFTWARE].color!;

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          Research Software
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Software Title */}
        <div className="rounded-md border-l-4 border-cyan-400 bg-cyan-50 dark:bg-cyan-950/20 p-4">
          <p className="text-lg font-medium leading-relaxed">{data.title}</p>
        </div>

        {/* Repository */}
        {data.repository && (
          <div>
            <ItemTitle
              title="Repository"
              icon={<FolderGit2 className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex items-center gap-2">
              <ExternalUriLink
                uri={data.repository}
                label={formatUrlForDisplay(data.repository)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Research Project (schema:result) */}
        {data.project && (
          <div>
            <ItemTitle
              title="Research Project"
              icon={<FlaskConical className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex items-center gap-2">
              <ExternalUriLink
                uri={data.project}
                label={getLabel(data.project) || formatUrlForDisplay(data.project)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* License of the software (distinct from the nanopublication's license) */}
        {data.license && (
          <div>
            <ItemTitle
              title="License"
              icon={<Scale className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex items-center gap-2">
              <ExternalUriLink
                uri={data.license}
                label={getLabel(data.license) || formatUrlForDisplay(data.license)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Part Of */}
        {data.partOf && (
          <div>
            <ItemTitle
              title="Part Of"
              icon={<Link2 className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex items-center gap-2">
              <ExternalUriLink
                uri={data.partOf}
                label={getLabel(data.partOf)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Supporting Publications */}
        {data.supportingPublications.length > 0 && (
          <div>
            <ItemTitle
              title={
                data.supportingPublications.length === 1
                  ? "Supporting Publication"
                  : "Supporting Publications"
              }
              icon={<FileText className="h-4 w-4 inline-block mr-1" />}
            />
            <ul className="space-y-1">
              {data.supportingPublications.map((pub) => (
                <li key={pub} className="flex items-center gap-2">
                  <ExternalUriLink
                    uri={pub}
                    label={formatUrlForDisplay(pub)}
                    className="text-sm"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Resources */}
        {data.relatedResources.length > 0 && (
          <div>
            <ItemTitle
              title="Related Resources"
              icon={<ExternalLink className="h-4 w-4 inline-block mr-1" />}
            />
            <ul className="space-y-1">
              {data.relatedResources.map((resource) => (
                <li key={resource} className="flex items-center gap-2">
                  <ExternalUriLink
                    uri={resource}
                    label={getLabel(resource) || formatUrlForDisplay(resource)}
                    className="text-sm"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
