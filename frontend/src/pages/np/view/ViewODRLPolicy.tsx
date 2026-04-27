/**
 * ViewODRLPolicy
 *
 * User-friendly view for nanopubs created with the "ODRL Access Policy" template.
 * Extracts ODRL permissions, prohibitions, and duties and renders them as
 * natural-language statements.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLabels } from "@/hooks/use-labels";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import {
  Ban,
  CheckCircle2,
  Database,
  ExternalLink,
  Lock,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { DataFactory } from "n3";
import { useMemo } from "react";
import { CustomViewerProps } from "./NanopubViewer";
import { ExternalUriLink, ItemTitle } from "./shared-components";

const { namedNode } = DataFactory;

// ODRL namespace
const ODRL_NS = "http://www.w3.org/ns/odrl/2/";
const DPV_NS = "https://w3id.org/dpv#";

/**
 * Local labels for ODRL and DPV terms.
 *
 * These are hardcoded because fetching labels from browser is unreliable:
 * external RDF servers often lack CORS headers, don't serve per-term URIs,
 * and use varied content types (Turtle/RDF-XML/JSON-LD). Hardcoding a small
 * set of well-known vocabulary terms is how every RDF tool (Protégé, WebVOWL,
 * ODRL playground) handles this in practice.
 *
 * For unknown terms, the generic label resolver in `use-labels` will still
 * try to fetch RDF and look for rdfs:label, skos:prefLabel, or foaf:name.
 */
const VOCAB_LABELS: Record<string, string> = {
  // ODRL policy types
  [ODRL_NS + "Offer"]: "Offer",
  [ODRL_NS + "Set"]: "Set",
  [ODRL_NS + "Agreement"]: "Agreement",
  [ODRL_NS + "Policy"]: "Policy",
  // ODRL actions
  [ODRL_NS + "use"]: "Use",
  [ODRL_NS + "reproduce"]: "Reproduce",
  [ODRL_NS + "derive"]: "Derive",
  [ODRL_NS + "modify"]: "Modify",
  [ODRL_NS + "distribute"]: "Distribute",
  [ODRL_NS + "present"]: "Present",
  [ODRL_NS + "commercialize"]: "Commercialize",
  [ODRL_NS + "sell"]: "Sell",
  [ODRL_NS + "attribute"]: "Attribute",
  [ODRL_NS + "compensate"]: "Compensate",
  [ODRL_NS + "obtainConsent"]: "Obtain Consent",
  // ODRL constraint vocabulary
  [ODRL_NS + "purpose"]: "purpose",
  // DPV purposes
  [DPV_NS + "AcademicResearch"]: "Academic Research",
  [DPV_NS + "ScientificResearch"]: "Scientific Research",
  [DPV_NS + "NonCommercialResearch"]: "Non-Commercial Research",
  [DPV_NS + "PublicBenefit"]: "Public Benefit",
};

/** ODRL operators → natural-language words (grammatical, not labels). */
const OPERATOR_WORDS: Record<string, string> = {
  [ODRL_NS + "eq"]: "is",
  [ODRL_NS + "neq"]: "is not",
  [ODRL_NS + "gt"]: "greater than",
  [ODRL_NS + "lt"]: "less than",
  [ODRL_NS + "gteq"]: "at least",
  [ODRL_NS + "lteq"]: "at most",
};

/** Resolve a URI to a human-readable label, preferring local vocab map. */
function vocabLabel(uri: string, fallback: string): string {
  return VOCAB_LABELS[uri] || fallback;
}

const PREDICATES = {
  type: NS.RDF("type"),
  target: namedNode(ODRL_NS + "target"),
  permission: namedNode(ODRL_NS + "permission"),
  prohibition: namedNode(ODRL_NS + "prohibition"),
  duty: namedNode(ODRL_NS + "duty"),
  action: namedNode(ODRL_NS + "action"),
  constraint: namedNode(ODRL_NS + "constraint"),
  leftOperand: namedNode(ODRL_NS + "leftOperand"),
  operator: namedNode(ODRL_NS + "operator"),
  rightOperand: namedNode(ODRL_NS + "rightOperand"),
  attributedParty: namedNode(ODRL_NS + "attributedParty"),
};

const POLICY_TYPES = new Set([
  ODRL_NS + "Offer",
  ODRL_NS + "Set",
  ODRL_NS + "Agreement",
  ODRL_NS + "Policy",
]);

interface Constraint {
  leftOperand?: string;
  operator?: string;
  rightOperand?: string;
}

interface Permission {
  action: string;
  constraints: Constraint[];
}

interface Prohibition {
  action: string;
}

interface Duty {
  action: string;
  attributedParty?: string;
}

interface ODRLPolicyData {
  policyUri: string;
  policyType: string;
  target?: string;
  permissions: Permission[];
  prohibitions: Prohibition[];
  duties: Duty[];
}

function extractODRLPolicy(store: NanopubStore): ODRLPolicyData | null {
  if (!store.graphUris.assertion) return null;
  const assertionGraph = namedNode(store.graphUris.assertion);

  // Find the policy: a subject whose rdf:type is an ODRL policy type
  const typeQuads = store.getQuads(
    null,
    PREDICATES.type,
    null,
    assertionGraph,
  );

  let policyUri: string | null = null;
  let policyType: string | null = null;

  for (const q of typeQuads) {
    if (POLICY_TYPES.has(q.object.value)) {
      policyUri = q.subject.value;
      policyType = q.object.value;
      break;
    }
  }

  if (!policyUri || !policyType) return null;

  const policyNode = namedNode(policyUri);

  // Target dataset
  const targetQuad = store.matchOne(
    policyNode,
    PREDICATES.target,
    null,
    assertionGraph,
  );
  const target = targetQuad?.object.value;

  // Permissions
  const permissionQuads = store.getQuads(
    policyNode,
    PREDICATES.permission,
    null,
    assertionGraph,
  );
  const permissions: Permission[] = permissionQuads
    .map((q) => {
      const permNode = q.object;
      const actionQuad = store.matchOne(
        permNode,
        PREDICATES.action,
        null,
        assertionGraph,
      );
      const action = actionQuad?.object.value;
      if (!action) return null;

      // Constraints attached to this permission
      const constraintQuads = store.getQuads(
        permNode,
        PREDICATES.constraint,
        null,
        assertionGraph,
      );
      const constraints: Constraint[] = constraintQuads.map((cq) => {
        const cNode = cq.object;
        const leftOp = store.matchOne(
          cNode,
          PREDICATES.leftOperand,
          null,
          assertionGraph,
        );
        const op = store.matchOne(
          cNode,
          PREDICATES.operator,
          null,
          assertionGraph,
        );
        const rightOp = store.matchOne(
          cNode,
          PREDICATES.rightOperand,
          null,
          assertionGraph,
        );
        return {
          leftOperand: leftOp?.object.value,
          operator: op?.object.value,
          rightOperand: rightOp?.object.value,
        };
      });

      return { action, constraints };
    })
    .filter((p): p is Permission => p !== null);

  // Prohibitions
  const prohibitionQuads = store.getQuads(
    policyNode,
    PREDICATES.prohibition,
    null,
    assertionGraph,
  );
  const prohibitions: Prohibition[] = prohibitionQuads
    .map((q) => {
      const actionQuad = store.matchOne(
        q.object,
        PREDICATES.action,
        null,
        assertionGraph,
      );
      const action = actionQuad?.object.value;
      return action ? { action } : null;
    })
    .filter((p): p is Prohibition => p !== null);

  // Duties
  const dutyQuads = store.getQuads(
    policyNode,
    PREDICATES.duty,
    null,
    assertionGraph,
  );
  const duties: Duty[] = [];
  for (const q of dutyQuads) {
    const dutyNode = q.object;
    const actionQuad = store.matchOne(
      dutyNode,
      PREDICATES.action,
      null,
      assertionGraph,
    );
    const action = actionQuad?.object.value;
    if (!action) continue;

    const partyQuad = store.matchOne(
      dutyNode,
      PREDICATES.attributedParty,
      null,
      assertionGraph,
    );
    duties.push({
      action,
      attributedParty: partyQuad?.object.value,
    });
  }

  return {
    policyUri,
    policyType,
    target,
    permissions,
    prohibitions,
    duties,
  };
}

/** Strip namespace from a URI and titlecase the local name. */
function prettyActionName(uri: string): string {
  const idx = Math.max(uri.lastIndexOf("#"), uri.lastIndexOf("/"));
  const local = idx >= 0 ? uri.substring(idx + 1) : uri;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function ViewODRLPolicy({ store }: CustomViewerProps) {
  const data = useMemo(() => extractODRLPolicy(store), [store]);
  const { getLabel } = useLabels();

  if (!data) return null;

  const policyTypeLabel = vocabLabel(
    data.policyType,
    getLabel(data.policyType) || prettyActionName(data.policyType),
  );

  return (
    <Card className="border-l-8 border-l-sky-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-sky-600" />
          ODRL Access Policy
          <Badge variant="secondary" className="ml-2">
            {policyTypeLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Policy URI */}
        <div>
          <ItemTitle
            title="Policy"
            icon={<ShieldCheck className="h-4 w-4 inline-block mr-1" />}
          />
          <ExternalUriLink uri={data.policyUri} className="text-sm" />
        </div>

        {/* Target dataset */}
        {data.target && (
          <div>
            <ItemTitle
              title="Applies to dataset"
              icon={<Database className="h-4 w-4 inline-block mr-1" />}
            />
            <ExternalUriLink uri={data.target} className="text-sm" />
          </div>
        )}

        {/* Permissions */}
        {data.permissions.length > 0 && (
          <div>
            <ItemTitle
              title="Permitted"
              icon={
                <CheckCircle2 className="h-4 w-4 inline-block mr-1 text-emerald-600" />
              }
            />
            <ul className="mt-2 space-y-2">
              {data.permissions.map((p, i) => (
                <li
                  key={i}
                  className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    >
                      {vocabLabel(p.action, getLabel(p.action))}
                    </Badge>
                  </div>
                  {p.constraints.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {p.constraints.map((c, j) => (
                        <div key={j}>
                          Only if{" "}
                          <span className="font-medium">
                            {c.leftOperand
                              ? vocabLabel(c.leftOperand, getLabel(c.leftOperand))
                              : "?"}
                          </span>{" "}
                          {c.operator
                            ? OPERATOR_WORDS[c.operator] ||
                              getLabel(c.operator)
                            : "?"}{" "}
                          <a
                            href={c.rightOperand}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium"
                          >
                            {c.rightOperand
                              ? vocabLabel(
                                  c.rightOperand,
                                  getLabel(c.rightOperand),
                                )
                              : "?"}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prohibitions */}
        {data.prohibitions.length > 0 && (
          <div>
            <ItemTitle
              title="Prohibited"
              icon={<Ban className="h-4 w-4 inline-block mr-1 text-rose-600" />}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {data.prohibitions.map((p, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="border-rose-400 text-rose-700 dark:text-rose-400"
                >
                  {vocabLabel(p.action, getLabel(p.action))}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Duties */}
        {data.duties.length > 0 && (
          <div>
            <ItemTitle
              title="Duties"
              icon={<Scale className="h-4 w-4 inline-block mr-1" />}
            />
            <ul className="mt-2 space-y-2">
              {data.duties.map((d, i) => (
                <li
                  key={i}
                  className="rounded-md border bg-muted/50 p-3 text-sm"
                >
                  <span className="font-medium">
                    {vocabLabel(d.action, getLabel(d.action))}
                  </span>
                  {d.attributedParty && (
                    <>
                      {" to "}
                      <a
                        href={d.attributedParty}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {getLabel(d.attributedParty)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
