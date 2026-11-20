import { readFile } from "fs/promises";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { NanopubTemplate } from "../src/lib/nanopub-template";

/**
 * The template ontology says the assertion "also serves as the identifier for the template
 * itself" by convention, not by rule, and templates in use declare nt:AssertionTemplate on
 * another subject. Those have to render a form like any other.
 */
describe("a template declared on a subject other than the assertion", () => {
  const load = async (file: string) =>
    NanopubTemplate.loadString(
      await readFile(join(__dirname, "fixtures", file), "utf-8"),
    );

  it("finds the template, its description and its fields", async () => {
    // sub:short-name-of-user-story a nt:AssertionTemplate, not sub:assertion
    const template = await load("RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw.trig");

    expect(template.templateMetadata.description).toBe("Describes a User Story.");
    expect(template.statements.size).toBeGreaterThan(0);
    const labels = template.fields.map((f) => f.label);
    expect(labels).toEqual(
      expect.arrayContaining(["user", "activity", "purpose", "domain", "risk"]),
    );
  });

  it("still reads a template declared on the assertion", async () => {
    const template = await load("RA61D4c7-odrl-policy-template.trig");
    expect(template.statements.size).toBeGreaterThan(0);
  });
});
