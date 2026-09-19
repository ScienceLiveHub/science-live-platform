/**
 * I-ADOPT variables (https://w3id.org/iadopt/ont/)
 *
 * Reads the I-ADOPT decomposition of a variable from a nanopub assertion and
 * turns it into a readable sentence in which every marked part is exactly one
 * component of the decomposition (no matching of free text against labels).
 */

import { DataFactory, NamedNode, Quad, Term, Writer } from "n3";
import { NanopubStore } from "./nanopub-store";
import { NS } from "./rdf";

const { namedNode, blankNode } = DataFactory;

/** Any node found as a subject or object of a triple. */
type RdfNode = { termType: string; value: string };

/** Rebuild an n3 term from a node, to use it in store lookups. */
const asTerm = (n: RdfNode): Term =>
  n.termType === "BlankNode" ? blankNode(n.value) : namedNode(n.value);

export const IOP = (local: string) =>
  namedNode(`https://w3id.org/iadopt/ont/${local}`);

export type IadoptRole =
  | "property"
  | "object"
  | "matrix"
  | "context"
  | "constraint"
  | "statistic";

export interface IadoptComponent {
  /** IRI of the component (blank nodes keep their internal id) */
  id: string;
  label: string;
  /** External vocabulary IRI, when the component is not a nanopub-local node */
  uri?: string;
  /** Constraints attached to this component through iop:constrains */
  constraints: string[];
  /** Set when the entity is a system of several entities */
  system?:
    | {
        kind: "ratio";
        numerator: IadoptComponent;
        denominator: IadoptComponent;
      }
    | { kind: "flow"; source: IadoptComponent; target: IadoptComponent }
    | { kind: "parts"; parts: IadoptComponent[] };
}

export interface IadoptVariable {
  id: string;
  label?: string;
  comment?: string;
  property?: IadoptComponent;
  object?: IadoptComponent;
  matrix?: IadoptComponent;
  contexts: IadoptComponent[];
  statistic?: IadoptComponent;
  /** Constraints without a specific target (they qualify the whole variable) */
  constraints: string[];
}

export interface SentenceSegment {
  text: string;
  role?: IadoptRole;
  /** Component the segment stands for (absent for plain text) */
  component?: IadoptComponent;
  /** For constraints: the label of the component it constrains */
  constrains?: string;
}

function localName(iri: string): string {
  return decodeURIComponent(
    iri.replace(/[#/]$/, "").split(/[#/]/).pop() ?? iri,
  ).replace(/[_-]+/g, " ");
}

/**
 * Extract the (first) I-ADOPT variable described in the assertion graph.
 */
export function extractIadoptVariable(
  store: NanopubStore,
): IadoptVariable | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  const typeQuad = store.matchOne(null, NS.RDF("type"), IOP("Variable"), g);
  if (!typeQuad) return null;
  const v = typeQuad.subject;

  const one = (s: RdfNode, p: NamedNode) =>
    store.matchOne(asTerm(s), p, null, g)?.object;
  const all = (s: RdfNode, p: NamedNode) =>
    store.getQuads(asTerm(s), p, null, g).map((q: Quad) => q.object);
  const literal = (s: RdfNode, p: NamedNode) => one(s, p)?.value;

  // Constraints, indexed by the component they constrain
  const constraintsOf = new Map<string, string[]>();
  for (const c of all(v, IOP("hasConstraint"))) {
    const label = literal(c, NS.RDFS("label")) ?? localName(c.value);
    const targets = all(c, IOP("constrains"));
    for (const t of targets.length ? targets : [v]) {
      constraintsOf.set(t.value, [
        ...(constraintsOf.get(t.value) ?? []),
        label,
      ]);
    }
  }

  const component = (t: RdfNode | undefined): IadoptComponent | undefined => {
    if (!t) return undefined;
    const isBlank = t.termType === "BlankNode";
    // Nodes minted inside the nanopub (sub:_n…) are not external vocabulary terms
    const isLocal =
      isBlank ||
      (store.prefixes["sub"] && t.value.startsWith(store.prefixes["sub"]));
    const comp: IadoptComponent = {
      id: t.value,
      label: literal(t, NS.RDFS("label")) ?? localName(t.value),
      uri: isLocal ? undefined : t.value,
      constraints: constraintsOf.get(t.value) ?? [],
    };
    const numerator = one(t, IOP("hasNumerator"));
    const denominator = one(t, IOP("hasDenominator"));
    const source = one(t, IOP("hasSource"));
    const target = one(t, IOP("hasTarget"));
    const parts = all(t, IOP("hasPart"));
    if (numerator && denominator) {
      comp.system = {
        kind: "ratio",
        numerator: component(numerator)!,
        denominator: component(denominator)!,
      };
    } else if (source && target) {
      comp.system = {
        kind: "flow",
        source: component(source)!,
        target: component(target)!,
      };
    } else if (parts.length > 1) {
      comp.system = { kind: "parts", parts: parts.map((p) => component(p)!) };
    }
    return comp;
  };

  return {
    id: v.value,
    label: literal(v, NS.RDFS("label")),
    comment: literal(v, NS.RDFS("comment")),
    property: component(one(v, IOP("hasProperty"))),
    object: component(one(v, IOP("hasObjectOfInterest"))),
    matrix: component(one(v, IOP("hasMatrix"))),
    contexts: all(v, IOP("hasContextObject")).map((c) => component(c)!),
    statistic: component(one(v, IOP("hasStatisticalModifier"))),
    constraints: constraintsOf.get(v.value) ?? [],
  };
}

/** Constraint labels often start with a kind ("state: dissolved"); keep the value. */
const constraintText = (label: string) => label.replace(/^[^:]+:\s*/, "");

/**
 * Build the sentence:
 *   [statistic] property of object [in matrix] [relative to context]
 * Constraints on an entity follow it in brackets; constraints on the property
 * (or on the variable) qualify the whole phrase and come last.
 */
export function describeVariable(v: IadoptVariable): SentenceSegment[] {
  const segs: SentenceSegment[] = [];
  const text = (t: string) => segs.push({ text: t });

  const entity = (c: IadoptComponent, role: IadoptRole) => {
    if (c.system?.kind === "ratio") {
      entity(c.system.numerator, role);
      text(" in ");
      entity(c.system.denominator, role);
    } else if (c.system?.kind === "flow") {
      text("from ");
      entity(c.system.source, role);
      text(" to ");
      entity(c.system.target, role);
    } else if (c.system?.kind === "parts") {
      const parts = c.system.parts;
      parts.forEach((p, i) => {
        if (i > 0) text(i === parts.length - 1 ? " and " : ", ");
        entity(p, role);
      });
    } else {
      segs.push({ text: c.label, role, component: c });
    }
    for (const label of c.constraints) {
      text(" (");
      segs.push({
        text: constraintText(label),
        role: "constraint",
        constrains: c.label,
        component: { id: label, label, constraints: [] },
      });
      text(")");
    }
  };

  if (v.statistic) {
    segs.push({
      text: v.statistic.label,
      role: "statistic",
      component: v.statistic,
    });
    text(" ");
  }
  if (v.property) {
    segs.push({
      text: v.property.label,
      role: "property",
      component: v.property,
    });
  }
  if (v.object) {
    // "mass flux from A to B", but "temperature of water"
    const joiner = v.object.system?.kind === "flow" ? " " : " of ";
    text(v.property ? joiner : "");
    entity(v.object, "object");
  }
  if (v.matrix) {
    text(", in ");
    entity(v.matrix, "matrix");
  }
  for (const c of v.contexts) {
    text(", relative to ");
    entity(c, "context");
  }
  const trailing = [
    ...(v.property?.constraints.map((l) => [l, v.property!.label]) ?? []),
    ...v.constraints.map((l) => [l, v.label ?? "the variable"]),
  ];
  for (const [label, target] of trailing) {
    text(", ");
    segs.push({
      text: constraintText(label),
      role: "constraint",
      constrains: target,
      component: { id: label, label, constraints: [] },
    });
  }

  const first = segs.find((s) => s.text.trim());
  if (first)
    first.text = first.text.charAt(0).toUpperCase() + first.text.slice(1);
  return segs;
}

/**
 * Serialise the assertion graph as Turtle, e.g. for the iadopt-vis diagram
 * (https://github.com/SirkoS/iadopt-vis), which accepts ?ttl=.
 */
export function assertionAsTurtle(store: NanopubStore): Promise<string> {
  const g = store.graphUris.assertion;
  const quads = g ? store.getQuads(null, null, null, namedNode(g)) : [];
  const writer = new Writer({
    prefixes: { iop: "https://w3id.org/iadopt/ont/", rdfs: NS.RDFS("").value },
  });
  for (const q of quads) {
    writer.addQuad(q.subject, q.predicate, q.object);
  }
  return new Promise((resolve, reject) =>
    writer.end((err, result) => (err ? reject(err) : resolve(result))),
  );
}
