/**
 * ViewResearchSoftware
 *
 * User-friendly view for nanopubs created with the "Research Software" template.
 * Displays software title, repository, supporting publications, and related resources.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { Code2, ExternalLink, FolderGit2, FileText, Link2 } from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "../create/components/NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// Namespaces
const DCMITYPE_SOFTWARE = "http://purl.org/dc/dcmitype/Software";
const SCHEMA_MAINTAINER = "http://schema.org/maintainer";
const SKOS_RELATED = "http://www.w3.org/2004/02/skos/core#related";
const DCT_IS_PART_OF = "http://purl.org/dc/terms/isPartOf";
const DCT_TITLE = "http://purl.org/dc/terms/title";
const CITO_SUPPORTS = "http://purl.org/spar/cito/supports";

// --- Research Software extraction -----------------------------------------

interface ResearchSoftwareData {
  /** The software title */
  title: string;
  /** The software URI */
  softwareUri: string;
  /** Repository/maintainer URL (e.g., GitHub) */
  repository?: string;
  /** Parent project/collection this software is part of */
  partOf?: string;
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
  const title = titleQuad?.object.value || store.findInternalLabel(softwareUri) || softwareUri;

  // Get repository/maintainer
  const maintainerQuad = store.matchOne(
    softwareNode,
    namedNode(SCHEMA_MAINTAINER),
    null,
    assertionGraph,
  );
  const repository = maintainerQuad?.object.value;

  // Get partOf (parent project/collection)
  const partOfQuad = store.matchOne(
    softwareNode,
    namedNode(DCT_IS_PART_OF),
    null,
    assertionGraph,
  );
  const partOf = partOfQuad?.object.value;

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
    partOf,
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
    if (url.startsWith("https://doi.org/") || url.startsWith("http://doi.org/")) {
      return url.replace(/^https?:\/\//, "");
    }
    return parsed.hostname + parsed.pathname;
  } catch {
    return url;
  }
}

export function ViewResearchSoftware({ store }: CustomViewerProps) {
  const data = useMemo(() => extractResearchSoftware(store), [store]);
  const { getLabel } = useLabels(store.labelCache);

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-cyan-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code2 className="h-5 w-5 text-cyan-600" />
          Research Software
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Software Title */}
        <div className="rounded-md border-l-4 border-cyan-400 bg-cyan-50 p-4 dark:bg-cyan-950/20">
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
