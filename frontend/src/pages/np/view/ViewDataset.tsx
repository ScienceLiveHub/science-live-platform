/**
 * ViewDataset
 *
 * User-friendly view for nanopubs created with the "FAIR Dataset" template.
 * Displays dataset title, description, creators, version, license, and access information.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import {
  Database,
  ExternalLink,
  Globe,
  Mail,
  Scale,
  Tag,
  Users,
} from "lucide-react";
import { DataFactory, Util } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// Namespaces
const FDOF_NS = "https://w3id.org/fdof/ontology#";
const DCAT_NS = "http://www.w3.org/ns/dcat#";
const DCT_NS = "http://purl.org/dc/terms/";

const PREDICATES = {
  type: NS.RDF("type"),
  label: namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
  comment: namedNode("http://www.w3.org/2000/01/rdf-schema#comment"),
  creator: namedNode(DCT_NS + "creator"),
  hasVersion: namedNode(DCT_NS + "hasVersion"),
  language: namedNode(DCT_NS + "language"),
  subject: namedNode(DCT_NS + "subject"),
  license: namedNode(DCT_NS + "license"),
  contactPoint: namedNode(DCAT_NS + "contactPoint"),
  fdoType: namedNode(FDOF_NS + "FAIRDigitalObject"),
};

// --- Dataset extraction -----------------------------------------

interface DatasetData {
  /** The dataset URI (e.g., DOI) */
  datasetUri: string;
  /** Dataset title/label */
  title: string;
  /** Dataset description */
  description?: string;
  /** Version string */
  version?: string;
  /** Language */
  language?: string;
  /** Subject/domain URIs */
  subjects: string[];
  /** Creator ORCID URIs */
  creators: string[];
  /** Contact email */
  contactPoint?: string;
  /** License URI */
  license?: string;
}

function extractDataset(store: NanopubStore): DatasetData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the dataset: subject with rdf:type fdof:FAIRDigitalObject
  // or look for rdfs:label + rdfs:comment pattern
  let datasetUri: string | null = null;

  // Try to find FAIR Digital Object type first
  const fdoTypeQuad = store.matchOne(
    null,
    PREDICATES.type,
    PREDICATES.fdoType,
    assertionGraph,
  );

  if (fdoTypeQuad) {
    datasetUri = fdoTypeQuad.subject.value;
  } else {
    // Fallback: find a subject that has both rdfs:label and rdfs:comment
    const labelQuads = store.getQuads(
      null,
      PREDICATES.label,
      null,
      assertionGraph,
    );
    for (const q of labelQuads) {
      const hasComment = store.matchOne(
        q.subject,
        PREDICATES.comment,
        null,
        assertionGraph,
      );
      if (hasComment) {
        datasetUri = q.subject.value;
        break;
      }
    }
  }

  if (!datasetUri) return null;

  const datasetNode = namedNode(datasetUri);

  // Get title (rdfs:label)
  const titleQuad = store.matchOne(
    datasetNode,
    PREDICATES.label,
    null,
    assertionGraph,
  );
  const title = titleQuad?.object.value || datasetUri;

  // Get description (rdfs:comment)
  const descQuad = store.matchOne(
    datasetNode,
    PREDICATES.comment,
    null,
    assertionGraph,
  );
  const description = descQuad?.object.value;

  // Get version
  const versionQuad = store.matchOne(
    datasetNode,
    PREDICATES.hasVersion,
    null,
    assertionGraph,
  );
  const version = versionQuad?.object.value;

  // Get language
  const langQuad = store.matchOne(
    datasetNode,
    PREDICATES.language,
    null,
    assertionGraph,
  );
  const language = langQuad?.object.value;

  // Get subjects
  const subjectQuads = store.getQuads(
    datasetNode,
    PREDICATES.subject,
    null,
    assertionGraph,
  );
  const subjects = subjectQuads
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => q.object.value);

  // Get creators (ORCID URIs)
  const creatorQuads = store.getQuads(
    datasetNode,
    PREDICATES.creator,
    null,
    assertionGraph,
  );
  const creators = creatorQuads
    .filter((q) => Util.isNamedNode(q.object))
    .map((q) => q.object.value);

  // Get contact point
  const contactQuad = store.matchOne(
    datasetNode,
    PREDICATES.contactPoint,
    null,
    assertionGraph,
  );
  const contactPoint = contactQuad?.object.value;

  // Get license
  const licenseQuad = store.matchOne(
    datasetNode,
    PREDICATES.license,
    null,
    assertionGraph,
  );
  const license = licenseQuad?.object.value;

  return {
    datasetUri,
    title,
    description,
    version,
    language,
    subjects,
    creators,
    contactPoint,
    license,
  };
}

/**
 * Formats an ORCID URL for display
 */
function formatOrcid(uri: string): string {
  const orcidMatch = uri.match(/orcid\.org\/(.+)$/);
  if (orcidMatch) {
    return orcidMatch[1];
  }
  return uri;
}

export function ViewDataset({ store }: CustomViewerProps) {
  const data = useMemo(() => extractDataset(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-violet-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-violet-600" />
          FAIR Dataset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Dataset Title */}
        <div className="rounded-md border-l-4 border-violet-400 bg-violet-50 p-4 dark:bg-violet-950/20">
          <p className="text-lg font-medium leading-relaxed">{data.title}</p>
          {data.version && (
            <Badge variant="secondary" className="mt-2">
              v{data.version}
            </Badge>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <div>
            <ItemTitle title="Description" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </div>
        )}

        {/* Dataset URI (DOI) */}
        <div>
          <ItemTitle
            title="Dataset Identifier"
            icon={<ExternalLink className="h-4 w-4 inline-block mr-1" />}
          />
          <ExternalUriLink
            uri={data.datasetUri}
            label={data.datasetUri.replace("https://doi.org/", "doi:")}
            className="text-sm"
          />
        </div>

        {/* Creators */}
        {data.creators.length > 0 && (
          <div>
            <ItemTitle
              title="Creators"
              icon={<Users className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex flex-wrap gap-2">
              {data.creators.map((creator) => (
                <a
                  key={creator}
                  href={creator}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="outline"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {getLabel(creator) || formatOrcid(creator)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Language */}
        {data.language && (
          <div>
            <ItemTitle
              title="Language"
              icon={<Globe className="h-4 w-4 inline-block mr-1" />}
            />
            <span className="text-sm">{getLabel(data.language)}</span>
          </div>
        )}

        {/* Subjects/Domain */}
        {data.subjects.length > 0 && (
          <div>
            <ItemTitle
              title="Subject"
              icon={<Tag className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="flex flex-wrap gap-2">
              {data.subjects.map((subject) => (
                <a
                  key={subject}
                  href={subject}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline"
                >
                  <Badge
                    variant="secondary"
                    className="gap-1 hover:bg-secondary/80"
                  >
                    {getLabel(subject)}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* License */}
        {data.license && (
          <div>
            <ItemTitle
              title="License"
              icon={<Scale className="h-4 w-4 inline-block mr-1" />}
            />
            <ExternalUriLink
              uri={data.license}
              label={getLabel(data.license)}
              className="text-sm"
            />
          </div>
        )}

        {/* Contact */}
        {data.contactPoint && (
          <div>
            <ItemTitle
              title="Contact"
              icon={<Mail className="h-4 w-4 inline-block mr-1" />}
            />
            <a
              href={
                data.contactPoint.startsWith("mailto:")
                  ? data.contactPoint
                  : `mailto:${data.contactPoint}`
              }
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.contactPoint.replace("mailto:", "")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
