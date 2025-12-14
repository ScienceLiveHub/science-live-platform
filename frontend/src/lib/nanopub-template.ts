import { DataFactory } from "n3";
import z from "zod";
import { FieldConfig } from "./formedible/types";
import { NanopubStore } from "./nanopub-store";
import {
  extractSubjectProps,
  extractSubjectsFiltered,
  fetchQuads,
  NS,
} from "./rdf";
import { getUriEnd } from "./utils";

const { namedNode } = DataFactory;

// Template placeholder types
// Get these from https://w3id.org/np/o/ntemplate/
// NOTE: some templates use https://w3id.org/np/o/ntemplate/latest/PlaceholderType, others do not have /latest/ in the path
export enum PlaceholderType {
  GUIDED_CHOICE = "GuidedChoicePlaceholder",
  LITERAL = "LiteralPlaceholder",
  LONG_LITERAL = "LongLiteralPlaceholder",
  RESTRICTED_CHOICE = "RestrictedChoicePlaceholder",
  SEQUENCE_ELEMENT = "SequenceElementPlaceholder",
  TRUSTY_URI = "TrustyUriPlaceholder",
  URI = "UriPlaceholder",
  VALUE = "ValuePlaceholder",
  REPEATABLE_STATEMENT = "RepeatableStatement",

  PLACEHOLDER = "Placeholder", // The super class, don't use this

  //TODO: these dont seem to exist anymore even though they are used in many older templates?
  EXTERNAL_URI = "ExternalUriPlaceholder", // -> map to URI
  TEXT_PLACEHOLDER = "TextPlaceholder", // -> map to LITERAL
}

// Template field definition
export interface TemplateField {
  id: string; // e.g., "sub:article", "sub:cited"
  label: string; // Human-readable label from rdfs:label
  type: string;
  required?: boolean;
  description?: string;
  options?: { name: string; description: string; uri?: string }[]; // For restricted choice placeholders
  placeholder?: string;
  multiple?: boolean; // For repeatable statements
  regex?: string; // For zod validation
}

/**
 * Convert nanopub placeholder type to enum
 */
function getPlaceholderType(typeUri: string): PlaceholderType {
  if (typeUri.includes("ExternalUriPlaceholder")) {
    return PlaceholderType.EXTERNAL_URI;
  }
  if (typeUri.includes("RestrictedChoicePlaceholder")) {
    return PlaceholderType.RESTRICTED_CHOICE;
  }
  if (typeUri.includes("TextPlaceholder")) {
    return PlaceholderType.TEXT_PLACEHOLDER;
  }
  if (typeUri.includes("RepeatableStatement")) {
    return PlaceholderType.REPEATABLE_STATEMENT;
  }
  return PlaceholderType.LITERAL; // Default
}

type Statement = {
  types?: string[];
  subject: string;
  predicate: string;
  object: string;
};
type Statements = Map<string, Statement>;

export class NanopubTemplate extends NanopubStore {
  /**
   * Fields specific to Templates
   */
  description: string = "-";
  fields: TemplateField[] = [];
  statements: Statements = new Map();
  type: "Assertion" | "Provenance" | "Pubinfo" | "Unlisted" | "Nanopub" =
    "Nanopub";

  static async load(
    url: string,
    setStore: (store: NanopubTemplate, prefixes?: any) => void,
  ) {
    // Call the NanopubStore super-class load() then re-cast as NanopubTemplate and call template-specific init functions
    const setTemplate = async (store: NanopubStore, prefixes?: any) => {
      const template = Object.assign(
        new NanopubTemplate(),
        store,
      ) as NanopubTemplate;

      // Perform initialization specific to Templates
      await template.extractFields();

      setStore(template, prefixes);
    };
    return await super.load(url, setTemplate);
  }

  /**
   * Generate a nanopub using this template and the specified values for placeholders
   *
   * TODO: currently currently hardcoded to produce example nanopubs for testing only
   */
  applyTemplate(fields: any) {
    // TODO:
  }

  /**
   * Afer loading a nanopub template, extract its fields
   */
  async extractFields() {
    const fields: TemplateField[] = [];

    // ---- 1. Get the main properties of the template
    const propertyMap = {
      types_$array: [NS.RDF("type")],
      name: [NS.RDFS("label")],
      description: [NS.DCT("description")],
      statements_$array: [NS.NPT("includes"), NS.NPT("hasStatement")],
      targetNanopubType: [NS.NPT("hasTargetNanopubType")],
      labelPattern: [NS.NPT("hasNanopubLabelPattern")],
      tags_$array: [NS.NPT("hasTag")],
    };

    // We are only interested in the assertion graph which contains the template
    const thisTemplate = namedNode(this.graphUris.assertion!);

    const props = extractSubjectProps(
      this,
      thisTemplate,
      propertyMap,
      this.graphUris.assertion,
    );

    props.statements = props.statements?.sort();

    // Extract template metadata
    let description = props.description ?? "";

    // ---- 2. Get the "Placeholders" and their attributes (user-entered fields)
    const placeholderPropertyMap = {
      type: [NS.RDF("type")],
      name: [NS.RDFS("label")],
      description: [NS.DCT("description")],
      possibleValuesFrom: [NS.NPT("possibleValuesFrom")],
      hasRegex: [NS.NPT("hasRegex")],
      hasPrefix: [NS.NPT("hasPrefix")],
      hasPrefixLabel: [NS.NPT("hasPrefixLabel")],
    };
    type Placeholder = {
      type: string;
      name: string;
      description: string;
      possibleValuesFrom: string;
      hasRegex: string;
      hasPrefix: string;
      hasPrefixLabel: string;
    };

    type Placeholders = Map<string, Placeholder>;
    const placeholders: Placeholders = extractSubjectsFiltered(
      this,
      placeholderPropertyMap,
      (q) =>
        q.object.value.startsWith("https://w3id.org/np/o/ntemplate") &&
        q.object.value.endsWith("Placeholder"),
      this.graphUris.assertion,
    );

    // ---- 3. Get the "Statements" and their attributes (what will be output to the created nanopub)
    const statementsPropertyMap = {
      types_$array: [NS.RDF("type")],
      subject: [NS.RDF("subject")],
      predicate: [NS.RDF("predicate")],
      object: [NS.RDF("object")],
    };

    const statements: Statements = extractSubjectsFiltered(
      this,
      statementsPropertyMap,
      (q) => (props.statements as string[])?.includes(q.subject.value),
      this.graphUris.assertion,
    );

    // ---- 4. match up properties of statements to contained placeholders
    for (const [pk, pv] of placeholders) {
      // Check whether required/optional
      // It's optional if it appears only in optional statements and doesn't appear in any non-optional statements
      const required = Object.values(statements).some(
        (q: Statement) =>
          q.object === pk &&
          q.types?.includes(
            "https://w3id.org/np/o/ntemplate/OptionalStatement",
          ),
      );

      // test using https://w3id.org/np/RAX_4tWTyjFpO6nz63s14ucuejd64t2mK3IBlkwZ7jjLo

      // TODO: Check whether repeatable
      // It's repeatable if its part of a repeatable statement
      // if multiple placeholders are part of the same statement, they should be grouped together when part of the multiple or just follow statements?

      // // Check if it's part of a repeatable statement
      // const repeatableQuad = assertionQuads.find(
      //   (quad) =>
      //     quad.subject.value.includes("st") &&
      //     quad.object.value === fieldId &&
      //     assertionQuads.some(
      //       (stQuad) =>
      //         stQuad.subject.equals(quad.subject) &&
      //         stQuad.predicate.equals(NS.RDF("type")) &&
      //         stQuad.object.equals(NS.NPT("RepeatableStatement")),
      //     ),
      // );

      // Get options for restricted choice placeholders
      const options: { name: string; description: string; uri?: string }[] = [];

      if (pv.possibleValuesFrom) {
        // TODO: multiple fields might use the same possibleValues, better to cache this
        await fetchQuads(pv.possibleValuesFrom, (q) => {
          if (
            q.predicate.equals(NS.RDFS("label")) &&
            getUriEnd(q.graph.value) === "assertion"
          ) {
            options.push({
              name: q.subject.value,
              description: q.object.value,
              uri: q.subject.value, // TODO: is there any point if name is the same?
            });
          }
        });
      }

      fields.push({
        id: pk,
        label: pv.name,
        type: getUriEnd(pv.type) ?? pv.type,
        description: pv.description,
        regex: pv.hasRegex,
        options: options?.length > 0 ? options : undefined,
        // multiple: !!repeatableQuad,
        required, // Placeholders are required by default
        // placeholder: `Enter ${label.toLowerCase()}`,
      });
    }
    this.fields = fields;
    this.statements = statements;
    this.description = description;
  }
}

/**
 * Convert template fields to Formedible field configurations
 */
export function templateFieldsToFormedible(
  fields: TemplateField[],
): FieldConfig[] {
  return fields.map((field): FieldConfig => {
    const baseField: FieldConfig = {
      name: field.id.replace(/[^a-zA-Z0-9]/g, "_"), // Sanitize name for form
      type: getFormedibleFieldType(field.type as PlaceholderType),
      label: field.label,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
    };

    // Add type-specific configurations
    switch (field.type) {
      case PlaceholderType.URI:
      case PlaceholderType.EXTERNAL_URI:
      case PlaceholderType.TRUSTY_URI:
        baseField.type = "url";
        baseField.placeholder = "https://... or other URL";
        break;

      case PlaceholderType.RESTRICTED_CHOICE:
        baseField.type = "combobox";
        baseField.options =
          field.options?.map((option) => ({
            value: option.name,
            label: option.description,
          })) || [];
        baseField.comboboxConfig = {
          searchable: true,
          placeholder: `Select ${field.label.toLowerCase()}...`,
          noOptionsText: "No options available",
        };
        break;

      case PlaceholderType.TEXT_PLACEHOLDER:
      case PlaceholderType.LITERAL:
        baseField.type = "text";
        break;

      case PlaceholderType.REPEATABLE_STATEMENT:
        baseField.type = "array";
        baseField.arrayConfig = {
          itemType: "text",
          itemLabel: field.label,
          itemPlaceholder: field.placeholder,
          minItems: field.required ? 1 : 0,
          addButtonLabel: `Add ${field.label}`,
          removeButtonLabel: "Remove",
        };
        break;

      default:
        console.warn("Unknown Field Type: ", field);
    }
    return baseField;
  });
}

/**
 * Convert placeholder type to Formedible field type
 */
function getFormedibleFieldType(placeholderType: PlaceholderType): string {
  switch (placeholderType) {
    case PlaceholderType.URI:
    case PlaceholderType.EXTERNAL_URI:
    case PlaceholderType.TRUSTY_URI:
      return "url";
    case PlaceholderType.RESTRICTED_CHOICE:
      return "combobox";
    case PlaceholderType.TEXT_PLACEHOLDER:
    case PlaceholderType.LITERAL:
      return "text";
    case PlaceholderType.REPEATABLE_STATEMENT:
      return "array";
    default:
      return "text";
  }
}

/**
 * Generate a Zod schema from template fields
 */
export function generateZodSchema(
  fields: TemplateField[],
): z.ZodSchema<Record<string, unknown>> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  const regexString = (r?: string) =>
    r ? z.string().regex(RegExp(r)) : z.string();
  const regexUrl = (r?: string) => (r ? z.url().regex(RegExp(r)) : z.url());

  for (const field of fields) {
    const fieldName = field.id.replace(/[^a-zA-Z0-9]/g, "_");
    let fieldSchema: z.ZodTypeAny;

    // Base schema based on type
    switch (field.type) {
      case PlaceholderType.URI:
      case PlaceholderType.EXTERNAL_URI:
        fieldSchema = regexUrl(field.regex);
        break;

      case PlaceholderType.TRUSTY_URI:
        // TODO: for trusty URI, we should do additional validation
        fieldSchema = regexUrl(field.regex);
        break;

      case PlaceholderType.RESTRICTED_CHOICE:
        fieldSchema = regexString(field.regex);
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options.map((o) => o.name));
        }
        break;

      case PlaceholderType.TEXT_PLACEHOLDER:
      case PlaceholderType.LITERAL:
        fieldSchema = regexString(field.regex).min(1, "This field is required");
        break;

      case PlaceholderType.REPEATABLE_STATEMENT:
        fieldSchema = z.array(regexString(field.regex)).default([]);
        break;

      default:
        fieldSchema = regexString(field.regex);
    }

    // Make optional if not required
    if (
      !field.required &&
      field.type !== PlaceholderType.REPEATABLE_STATEMENT
    ) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[fieldName] = fieldSchema;
  }

  return z.object(schemaFields);
}
