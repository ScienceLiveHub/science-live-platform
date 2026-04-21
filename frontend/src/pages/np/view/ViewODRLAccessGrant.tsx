/**
 * ViewODRLAccessGrant
 *
 * User-friendly view for nanopubs created with the "ODRL Access Grant" template.
 * Shows who was granted access, to which dataset, under which policy, with what
 * actions, and when.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import {
  CheckCircle2,
  Clock,
  Database,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

const ODRL_NS = "http://www.w3.org/ns/odrl/2/";
const PROV_NS = "http://www.w3.org/ns/prov#";
const FAIR_NS = "https://fair2adapt.eu/ns/";

const PREDICATES = {
  type: NS.RDF("type"),
  target: namedNode(ODRL_NS + "target"),
  assignee: namedNode(ODRL_NS + "assignee"),
  permission: namedNode(ODRL_NS + "permission"),
  action: namedNode(ODRL_NS + "action"),
  generatedAtTime: namedNode(PROV_NS + "generatedAtTime"),
  underPolicy: namedNode(FAIR_NS + "underPolicy"),
  agreementType: namedNode(ODRL_NS + "Agreement"),
};

interface GrantData {
  grantUri: string;
  target?: string;
  assignee?: string;
  policyNanopub?: string;
  timestamp?: string;
  grantedActions: string[];
}

function extractGrant(store: NanopubStore): GrantData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the grant: a subject with rdf:type odrl:Agreement
  const grantQuad = store.matchOne(
    null,
    PREDICATES.type,
    PREDICATES.agreementType,
    assertionGraph,
  );

  if (!grantQuad) return null;
  const grantUri = grantQuad.subject.value;
  const grantNode = namedNode(grantUri);

  // Target dataset
  const targetQuad = store.matchOne(
    grantNode,
    PREDICATES.target,
    null,
    assertionGraph,
  );

  // Assignee (DID)
  const assigneeQuad = store.matchOne(
    grantNode,
    PREDICATES.assignee,
    null,
    assertionGraph,
  );

  // Policy reference
  const policyQuad = store.matchOne(
    grantNode,
    PREDICATES.underPolicy,
    null,
    assertionGraph,
  );

  // Timestamp
  const timestampQuad = store.matchOne(
    grantNode,
    PREDICATES.generatedAtTime,
    null,
    assertionGraph,
  );

  // Granted actions (via odrl:permission -> odrl:action)
  const permissionQuads = store.getQuads(
    grantNode,
    PREDICATES.permission,
    null,
    assertionGraph,
  );
  const grantedActions: string[] = [];
  for (const q of permissionQuads) {
    const actionQuad = store.matchOne(
      q.object,
      PREDICATES.action,
      null,
      assertionGraph,
    );
    if (actionQuad) {
      grantedActions.push(actionQuad.object.value);
    }
  }

  return {
    grantUri,
    target: targetQuad?.object.value,
    assignee: assigneeQuad?.object.value,
    policyNanopub: policyQuad?.object.value,
    timestamp: timestampQuad?.object.value,
    grantedActions,
  };
}

function prettyActionName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  const local = idx >= 0 ? uri.substring(idx + 1) : uri;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function ViewODRLAccessGrant({ store }: CustomViewerProps) {
  const data = useMemo(() => extractGrant(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  return (
    <Card className="border-l-8 border-l-amber-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ticket className="h-5 w-5 text-amber-600" />
          ODRL Access Grant
          <Badge variant="secondary" className="ml-2 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Granted
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Grant identifier */}
        <div>
          <ItemTitle title="Grant" />
          <ExternalUriLink uri={data.grantUri} className="text-sm" />
        </div>

        {/* Dataset */}
        {data.target && (
          <div>
            <ItemTitle
              title="Dataset"
              icon={<Database className="h-4 w-4 inline-block mr-1" />}
            />
            <ExternalUriLink uri={data.target} className="text-sm" />
          </div>
        )}

        {/* Assignee (DID) */}
        {data.assignee && (
          <div>
            <ItemTitle
              title="Granted to"
              icon={<User className="h-4 w-4 inline-block mr-1" />}
            />
            <div className="text-sm font-mono bg-muted rounded px-2 py-1 inline-block break-all">
              {data.assignee}
            </div>
            {getLabel(data.assignee) && (
              <p className="text-xs text-muted-foreground mt-1">
                {getLabel(data.assignee)}
              </p>
            )}
          </div>
        )}

        {/* Granted actions */}
        {data.grantedActions.length > 0 && (
          <div>
            <ItemTitle
              title="Permitted actions"
              icon={
                <CheckCircle2 className="h-4 w-4 inline-block mr-1 text-emerald-600" />
              }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {data.grantedActions.map((action, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 dark:text-emerald-400"
                >
                  {prettyActionName(action)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Under policy */}
        {data.policyNanopub && (
          <div>
            <ItemTitle
              title="Under policy"
              icon={<ShieldCheck className="h-4 w-4 inline-block mr-1" />}
            />
            <ExternalUriLink
              uri={data.policyNanopub}
              label={getLabel(data.policyNanopub)}
              className="text-sm"
            />
          </div>
        )}

        {/* Timestamp */}
        {data.timestamp && (
          <div>
            <ItemTitle
              title="Granted at"
              icon={<Clock className="h-4 w-4 inline-block mr-1" />}
            />
            <span className="text-sm text-muted-foreground">
              {formatTimestamp(data.timestamp)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
