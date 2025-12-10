import { DataFactory } from "n3";
import z from "zod";
import { FieldConfig } from "./formedible/types";
import { NanopubStore } from "./nanopub-store";
import { extractSubjectProps, extractSubjectsFiltered, NS } from "./rdf";

const { namedNode } = DataFactory;

// Template placeholder types
// Get these from https://w3id.org/np/o/ntemplate/
export enum PlaceholderType {
  GUIDED_CHOICE = "https://w3id.org/np/o/ntemplate/latest/GuidedChoicePlaceholder",
  LITERAL = "https://w3id.org/np/o/ntemplate/latest/LiteralPlaceholder",
  LONG_LITERAL = "https://w3id.org/np/o/ntemplate/latest/LongLiteralPlaceholder",
  PLACEHOLDER = "https://w3id.org/np/o/ntemplate/latest/Placeholder",
  RESTRICTED_CHOICE = "https://w3id.org/np/o/ntemplate/latest/RestrictedChoicePlaceholder",
  SEQUENCE_ELEMENT = "https://w3id.org/np/o/ntemplate/latest/SequenceElementPlaceholder",
  TRUSTY_URI = "https://w3id.org/np/o/ntemplate/latest/TrustyUriPlaceholder",
  URI = "https://w3id.org/np/o/ntemplate/latest/UriPlaceholder",
  VALUE = "https://w3id.org/np/o/ntemplate/latest/ValuePlaceholder",
  REPEATABLE_STATEMENT = "https://w3id.org/np/o/ntemplate/latest/RepeatableStatement",

  //TODO: these dont seem to exist even though they are used in many templates?
  EXTERNAL_URI = "https://w3id.org/np/o/ntemplate/ExternalUriPlaceholder",
  TEXT_PLACEHOLDER = "TextPlaceholder",
}

// Template field definition
export interface TemplateField {
  id: string; // e.g., "sub:article", "sub:cited"
  label: string; // Human-readable label from rdfs:label
  type: string;
  required?: boolean;
  description?: string;
  options?: string[]; // For restricted choice placeholders
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
  return PlaceholderType.TEXT_PLACEHOLDER; // Default
}

export class NanopubTemplate extends NanopubStore {
  /**
   * Fields specific to Templates
   */
  description: string = "-";
  fields: TemplateField[] = [];

  static async load(
    url: string,
    setStore: (store: NanopubTemplate, prefixes?: any) => void,
  ) {
    // Call the NanopubStore super-class load() then re-cast as NanopubTemplate and call template-specific init functions
    const setTemplate = (store: NanopubStore, prefixes?: any) => {
      const template = Object.assign(
        new NanopubTemplate(),
        store,
      ) as NanopubTemplate;

      // Perofmr initialization specific to Templates
      template.extractFields();

      setStore(template, prefixes);
    };
    await super.load(url, setTemplate);
  }

  /**
   * Afer loading a nanopub template, extract its fields
   */
  extractFields() {
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
    type Placeholders = Record<
      string,
      Record<keyof typeof placeholderPropertyMap, any>
    >;
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
    type Statements = Record<
      string,
      Record<keyof typeof statementsPropertyMap | "types", any>
    >;

    const statements: Statements = extractSubjectsFiltered(
      this,
      statementsPropertyMap,
      (q) => (props.statements as string[])?.includes(q.subject.value),
      this.graphUris.assertion,
    );

    // ---- 4. match up properties of statements to contained placeholders
    Object.entries(placeholders).forEach(([pk, p]) => {
      // Check whether required/optional
      // It's optional if it appears only in optional statements and doesn't appear in any non-optional statements
      const required = !Object.entries(statements).some(
        ([, q]) =>
          q.object === pk &&
          q.types?.includes(
            "https://w3id.org/np/o/ntemplate/OptionalStatement",
          ),
      );

      // TODO: Check whether repeatable
      // It's repeatable if its part of a repeatable statement

      // TODO: Check whether it's a multichoice
      // It's repeatable if its part of a repeatable statement

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

      // // Get options for restricted choice placeholders
      // let options: string[] | undefined;
      // if (fieldType === PlaceholderType.RESTRICTED_CHOICE) {
      //   const possibleValuesQuad = assertionQuads.find(
      //     (quad) =>
      //       quad.subject.equals(g.subject) &&
      //       quad.predicate.equals(NS.NPT("possibleValuesFrom")),
      //   );

      //   if (possibleValuesQuad) {
      //     // For now, we'll store the URI and fetch it separately if needed
      //     // In a real implementation, you might want to fetch the options
      //     options = [];
      //   }
      // }

      fields.push({
        id: pk,
        label: p.name,
        type: p.type,
        description: p.description,
        regex: p.hasRegex,
        // options,
        // multiple: !!repeatableQuad,
        required, // Most placeholders are required by default
        // placeholder: `Enter ${label.toLowerCase()}`,
      });
    });
    this.fields = fields;
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
      case PlaceholderType.EXTERNAL_URI:
        baseField.type = "url";
        baseField.placeholder = "https://doi.org/10... or other URL";
        break;

      case PlaceholderType.RESTRICTED_CHOICE:
        baseField.type = "combobox";
        baseField.options =
          field.options?.map((option) => ({ value: option, label: option })) ||
          [];
        baseField.comboboxConfig = {
          searchable: true,
          placeholder: `Select ${field.label.toLowerCase()}...`,
          noOptionsText: "No options available",
        };
        break;

      case PlaceholderType.TEXT_PLACEHOLDER:
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
    }
    return baseField;
  });
}

/**
 * Convert placeholder type to Formedible field type
 */
function getFormedibleFieldType(placeholderType: PlaceholderType): string {
  switch (placeholderType) {
    case PlaceholderType.EXTERNAL_URI:
      return "url";
    case PlaceholderType.RESTRICTED_CHOICE:
      return "combobox";
    case PlaceholderType.TEXT_PLACEHOLDER:
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

  for (const field of fields) {
    const fieldName = field.id.replace(/[^a-zA-Z0-9]/g, "_");
    let fieldSchema: z.ZodTypeAny;

    // Base schema based on type
    switch (field.type) {
      case PlaceholderType.EXTERNAL_URI:
        fieldSchema = regexString(field.regex).url("Must be a valid URL");
        break;

      case PlaceholderType.RESTRICTED_CHOICE:
        fieldSchema = regexString(field.regex);
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        }
        break;

      case PlaceholderType.TEXT_PLACEHOLDER:
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
