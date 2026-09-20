/**
 * ViewIADOPTVariable
 *
 * User-friendly view for nanopubs describing an I-ADOPT variable
 * (https://w3id.org/iadopt/ont/). The decomposition is shown as a sentence
 * generated from its components, so every marked part is exactly one
 * component: what is measured (property), of what (object of interest),
 * inside what (matrix), relative to what (context object), under which
 * condition (constraint) and which statistic (statistical modifier).
 *
 * Roles are told apart by colour AND underline style (colour-blind safe), and
 * "Show roles" writes the role next to each part. Experts can open the
 * diagram from the I-ADOPT Visualizer (S. Schindler, CC BY 4.0), fed with the
 * nanopub's assertion.
 */

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assertionAsTurtle,
  describeVariable,
  extractIadoptVariable,
  IadoptRole,
} from "@/lib/iadopt";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getTemplateBorderClass,
  getTemplateColorClass,
  TEMPLATE_METADATA,
  TEMPLATE_URI,
} from "../create/components/templates/registry-metadata";
import { CustomViewerProps } from "./NanopubViewer";
import { ItemTitle } from "./shared-components";
import { TEMPLATE_VIEW_ICONS } from "./view-registry";

const VIS_URL = "https://sirkos.github.io/iadopt-vis/remote.html";
const VIS_ORIGIN = "https://sirkos.github.io";

/** Plain-language name of each role, then the I-ADOPT term. */
const ROLES: Record<IadoptRole, { plain: string; term: string }> = {
  property: { plain: "What is measured", term: "property" },
  object: { plain: "Of what", term: "object of interest" },
  matrix: { plain: "Inside what", term: "matrix" },
  context: { plain: "Relative to", term: "context object" },
  constraint: { plain: "Under which condition", term: "constraint" },
  statistic: { plain: "Which statistic", term: "statistical modifier" },
};

/**
 * Okabe-Ito colours (colour-blind safe) plus a distinct underline style per
 * role, so colour is never the only cue.
 */
const ROLE_CLASSES: Record<IadoptRole, string> = {
  property:
    "decoration-solid decoration-[#0072b2] bg-[#e1eef7] dark:decoration-[#56a8e0] dark:bg-[#13293a]",
  object:
    "decoration-double decoration-[#007a5a] bg-[#dcf1ea] dark:decoration-[#35c49a] dark:bg-[#10302a]",
  matrix:
    "decoration-dashed decoration-[#b87400] bg-[#fbefd6] dark:decoration-[#f0b43c] dark:bg-[#33280f]",
  context:
    "decoration-dotted decoration-[#b2558c] bg-[#f7e3ee] dark:decoration-[#e39ac6] dark:bg-[#3a1f2f]",
  constraint:
    "decoration-wavy decoration-[#c24a00] bg-[#fbe5d9] dark:decoration-[#ff8a4c] dark:bg-[#3a2116]",
  statistic:
    "decoration-solid decoration-1 decoration-[#2b8fc9] bg-[#e0f0fa] dark:decoration-[#8fd0f5] dark:bg-[#16303d]",
};

const TERM_BASE =
  "underline decoration-[3px] underline-offset-[6px] [text-decoration-skip-ink:none] rounded-sm px-0.5";

export function ViewIADOPTVariable({ store }: CustomViewerProps) {
  const variable = useMemo(() => extractIadoptVariable(store), [store]);
  const segments = useMemo(
    () => (variable ? describeVariable(variable) : []),
    [variable],
  );
  const { resolvedTheme } = useTheme();
  const [showRoles, setShowRoles] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [turtle, setTurtle] = useState<string | null>(null);
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    if (!showDiagram || turtle) return;
    let cancelled = false;
    assertionAsTurtle(store).then((ttl) => {
      if (!cancelled) setTurtle(ttl);
    });
    return () => {
      cancelled = true;
    };
  }, [showDiagram, turtle, store]);

  // The visualizer reports its drawing size ({ width, height }) to the top
  // window; when this view is itself embedded the message goes elsewhere and
  // the default ratio is kept.
  useEffect(() => {
    if (!showDiagram) return;
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== VIS_ORIGIN) return;
      const w = Number(ev.data?.width);
      const h = Number(ev.data?.height);
      if (w > 0 && h > 0) setAspect(w / h);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [showDiagram]);

  if (!variable) return null;
  const Icon = TEMPLATE_VIEW_ICONS[TEMPLATE_URI.IADOPT_VARIABLE];
  const color = TEMPLATE_METADATA[TEMPLATE_URI.IADOPT_VARIABLE].color!;
  const selectedSeg = selected !== null ? segments[selected] : undefined;
  const rolesUsed = [
    ...new Set(segments.map((s) => s.role).filter(Boolean)),
  ] as IadoptRole[];

  return (
    <Card
      className={`border-l-8 ${getTemplateBorderClass(color, resolvedTheme)}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon
            className={`h-5 w-5 ${getTemplateColorClass(color, resolvedTheme)}`}
          />
          I-ADOPT Variable
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* The label is already the page title (nanopub overview) */}
        {variable.comment && (
          <p className="text-muted-foreground">{variable.comment}</p>
        )}

        {/* Sentence generated from the decomposition */}
        <div className="space-y-3">
          <ItemTitle title="Described as" />
          <p className="text-lg leading-[2.4]">
            {segments.map((seg, i) =>
              seg.role ? (
                <button
                  key={i}
                  type="button"
                  aria-expanded={selected === i}
                  title={`${ROLES[seg.role].plain} (${ROLES[seg.role].term})`}
                  onClick={() => setSelected(selected === i ? null : i)}
                  className={`${TERM_BASE} ${ROLE_CLASSES[seg.role]} ${
                    selected === i ? "outline-2 outline-foreground" : ""
                  }`}
                >
                  {seg.text}
                  {showRoles && (
                    <sup className="ml-1 inline-block text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ROLES[seg.role].plain}
                    </sup>
                  )}
                </button>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
            {rolesUsed.map((role) => (
              <span key={role} className={`${TERM_BASE} ${ROLE_CLASSES[role]}`}>
                {ROLES[role].plain}
              </span>
            ))}
            <Button
              variant="outline"
              size="sm"
              aria-pressed={showRoles}
              onClick={() => setShowRoles(!showRoles)}
            >
              {showRoles ? "Hide roles" : "Show roles"}
            </Button>
          </div>

          <div
            className="rounded-md bg-muted/50 p-3 text-sm min-h-16"
            aria-live="polite"
          >
            {selectedSeg?.role ? (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {ROLES[selectedSeg.role].plain} ·{" "}
                  {ROLES[selectedSeg.role].term}
                </div>
                <div>
                  {selectedSeg.component?.label}
                  {selectedSeg.constrains &&
                    ` (constrains: ${selectedSeg.constrains})`}
                </div>
                {selectedSeg.component?.uri ? (
                  <a
                    href={selectedSeg.component.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link hover:underline inline-flex items-center gap-1 break-all"
                  >
                    {selectedSeg.component.uri}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <div className="text-muted-foreground">
                    Defined in this nanopublication.
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">
                Select a marked part to see what it is and where its term comes
                from.
              </span>
            )}
          </div>
        </div>

        {/* Diagram for experts */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            aria-expanded={showDiagram}
            onClick={() => setShowDiagram(!showDiagram)}
          >
            {showDiagram ? "Hide diagram" : "Show diagram"}
          </Button>
          {showDiagram && turtle && (
            <div className="space-y-1">
              <iframe
                title="I-ADOPT diagram of the variable"
                src={`${VIS_URL}?ttl=${encodeURIComponent(turtle)}`}
                className="w-full rounded-md border bg-white"
                style={{ aspectRatio: aspect }}
              />
              <p className="text-xs text-muted-foreground">
                Diagram:{" "}
                <a
                  href="https://doi.org/10.5281/zenodo.18097903"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link hover:underline"
                >
                  I-ADOPT Visualizer
                </a>
                , S. Schindler (2025), CC BY 4.0.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
