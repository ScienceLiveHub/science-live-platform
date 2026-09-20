/**
 * Tests for reading I-ADOPT variables and generating their sentence.
 *
 * Fixtures are two published variable nanopubs (template "I-ADOPT variable"):
 * - RA82u_b0…: dissolved oxygen, object = ratio system (oxygen / water),
 *   constraint "state: dissolved" on oxygen
 * - RA0JRzmV…: potential temperature, constraint on the property
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  assertionAsTurtle,
  describeVariable,
  extractIadoptVariable,
} from "../src/lib/iadopt";
import { NanopubStore } from "../src/lib/nanopub-store";

const load = async (name: string) =>
  NanopubStore.loadString(
    await readFile(join(__dirname, "fixtures", name), "utf-8"),
  );

const sentence = (segs: { text: string }[]) => segs.map((s) => s.text).join("");

describe("I-ADOPT variable: dissolved oxygen (ratio system)", () => {
  it("reads the decomposition", async () => {
    const store = await load(
      "RA82u_b09iJ40hQpyNHR1atuLegViMFfbrUcQA2oGqPJ4.trig",
    );
    const v = extractIadoptVariable(store)!;
    expect(v.label).toBe("Dissolved oxygen in sea water");
    expect(v.property?.uri).toBe(
      "http://qudt.org/vocab/quantitykind/MassConcentration",
    );
    expect(v.object?.system?.kind).toBe("ratio");
    expect(v.matrix?.label).toBe("sea surface layer");
  });

  it("marks each component exactly once, with constraints next to their target", async () => {
    const store = await load(
      "RA82u_b09iJ40hQpyNHR1atuLegViMFfbrUcQA2oGqPJ4.trig",
    );
    const segs = describeVariable(extractIadoptVariable(store)!);
    expect(sentence(segs)).toBe(
      "Mass concentration of oxygen (dissolved) in water, in sea surface layer",
    );
    const roles = segs.filter((s) => s.role).map((s) => [s.role, s.text]);
    expect(roles).toEqual([
      ["property", "Mass concentration"],
      ["object", "oxygen"],
      ["constraint", "dissolved"],
      ["object", "water"],
      ["matrix", "sea surface layer"],
    ]);
    const dissolved = segs.find((s) => s.text === "dissolved")!;
    expect(dissolved.constrains).toBe("oxygen");
  });
});

describe("I-ADOPT variable: potential temperature (constraint on the property)", () => {
  it("puts property constraints at the end of the sentence", async () => {
    const store = await load(
      "RA0JRzmVaaxM8F5-1bdcx3t-4Nk-xB-2WJr63p_q3YHZM.trig",
    );
    const segs = describeVariable(extractIadoptVariable(store)!);
    expect(sentence(segs)).toBe(
      "Thermodynamic temperature of water, in sea surface layer, at a water pressure of 0dbar",
    );
  });

  it("serialises the assertion as Turtle for the diagram", async () => {
    const store = await load(
      "RA0JRzmVaaxM8F5-1bdcx3t-4Nk-xB-2WJr63p_q3YHZM.trig",
    );
    const ttl = await assertionAsTurtle(store);
    expect(ttl).toContain("iop:Variable");
    expect(ttl).toContain("iop:hasProperty");
  });
});

describe("I-ADOPT variable: statistic, context object, flow system, variable constraint", () => {
  const trig = `
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix iop: <https://w3id.org/iadopt/ont/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex: <http://example.org/> .
ex:head { ex:np a np:Nanopublication ; np:hasAssertion ex:assertion ;
  np:hasProvenance ex:prov ; np:hasPublicationInfo ex:pubinfo . }
ex:assertion {
  ex:v a iop:Variable ; rdfs:label "Daily maximum carbon flux" ;
    iop:hasStatisticalModifier ex:max ; iop:hasProperty ex:flux ;
    iop:hasObjectOfInterest ex:sys ; iop:hasContextObject ex:atm ;
    iop:hasConstraint ex:c1 .
  ex:max rdfs:label "daily maximum" .
  ex:flux rdfs:label "mass flux" .
  ex:sys a iop:AsymmetricSystem ; iop:hasSource ex:veg ; iop:hasTarget ex:soil .
  ex:veg rdfs:label "vegetation" .
  ex:soil rdfs:label "soil" .
  ex:atm rdfs:label "atmosphere" .
  ex:c1 a iop:Constraint ; rdfs:label "season: summer" .
}
ex:prov { ex:assertion a ex:Thing . }
ex:pubinfo { ex:np a ex:Thing . }
`;

  it("covers the optional components", async () => {
    const store = await NanopubStore.loadString(trig);
    const segs = describeVariable(extractIadoptVariable(store)!);
    expect(sentence(segs)).toBe(
      "Daily maximum mass flux from vegetation to soil, relative to atmosphere, summer",
    );
    expect(segs.filter((s) => s.role).map((s) => s.role)).toEqual([
      "statistic",
      "property",
      "object",
      "object",
      "context",
      "constraint",
    ]);
  });
});
