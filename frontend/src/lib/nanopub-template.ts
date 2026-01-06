import * as RDFT from "@rdfjs/types";
import { DataFactory, Store, Writer } from "n3";
import { DEFAULT_NANOPUB_URI, sign } from "nanopub-js";
import z from "zod";
import { FieldConfig } from "./formedible/types";
import { NanopubStore } from "./nanopub-store";
import {
  extractSubjectProps,
  extractSubjectsFiltered,
  fetchPossibleValuesFromQuads,
  NS,
} from "./rdf";
import { cleanOrcidUri, getUriEnd } from "./utils";

const { namedNode, literal, blankNode } = DataFactory;

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
  AUTO_ESCAPE_URI = "AutoEscapeUriPlaceholder", // -> map to LONG_LITERAL

  INTRODUCED_RESOURCE = "IntroducedResource", // TODO: DO NOT INCLUDE as a placeholder, add it as a property of field
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
 * Is this a repeatable statement?
 */
function isRepeatable(statement: Statement) {
  return statement.types?.some(
    (t) => t.value === "https://w3id.org/np/o/ntemplate/RepeatableStatement",
  );
}

/**
 * Is this an optional statement?
 */
function isOptional(statement: Statement) {
  return statement.types?.some(
    (t) => t.value === "https://w3id.org/np/o/ntemplate/OptionalStatement",
  );
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
  if (typeUri.includes("LongLiteralPlaceholder")) {
    return PlaceholderType.LONG_LITERAL;
  }
  if (typeUri.includes("RepeatableStatement")) {
    return PlaceholderType.REPEATABLE_STATEMENT;
  }
  return PlaceholderType.LITERAL; // Default
}

type Statement = {
  id: string;
  types?: RDFT.Term[];
  subject: RDFT.Quad_Subject;
  predicate: RDFT.Quad_Predicate;
  object: RDFT.Quad_Object;
};
type Statements = Map<string, Statement>;

function termValue(term: RDFT.Term): string {
  return term.value;
}

export type TemplateMetadata = {
  description: string;
  targetNanopubType?: string;
  targetlabelPattern?: string;
};

export class NanopubTemplate extends NanopubStore {
  /**
   * Fields specific to Templates
   */
  description: string = "-";
  fields: TemplateField[] = [];
  statements: Statements = new Map();
  type: "Assertion" | "Provenance" | "Pubinfo" | "Unlisted" | "Nanopub" =
    "Nanopub";
  templateMetadata: TemplateMetadata = { description: "-" };

  static async load(url: string) {
    // Call the NanopubStore super-class load() then re-cast as NanopubTemplate and call template-specific init functions
    const template = Object.assign(
      new NanopubTemplate(),
      await super.load(url),
    ) as NanopubTemplate;

    // Perform initialization specific to Templates
    await template.extractFields();

    return template;
  }

  static async loadString(rdf: string) {
    // Call the NanopubStore super-class load() then re-cast as NanopubTemplate and call template-specific init functions
    const template = Object.assign(
      new NanopubTemplate(),
      await super.loadString(rdf),
    ) as NanopubTemplate;

    // Perform initialization specific to Templates
    await template.extractFields();

    return template;
  }

  /**
   * Generate a nanopub in trig format, using this template and the specified values for the placeholders
   */
  async applyTemplate(
    placeholderValues: Record<string, string>,
    pubData: {
      orcid: string;
      name: string;
      email?: string;
      license?: string;
      baseUri?: string;
      timestamp?: Date;
      isExample?: boolean;
    },
    privateKey: string,
  ) {
    const baseUri = DEFAULT_NANOPUB_URI;
    const newNanopubUri = baseUri;
    const newSubUri = `${newNanopubUri}`;

    // Create a new store for the generated nanopub
    const outputStore = new Store();

    // Helper function to replace placeholders in URIs
    const getPlaceholderValue = (
      uri: string,
      values: Record<string, string>,
    ): string => {
      // Replace sub: placeholders with values
      if (uri.startsWith("sub:")) {
        const placeholderName = uri.substring(4); // Remove "sub:" prefix
        const v = values[placeholderName];
        return typeof v === "string" ? v : uri; // Replace with value or keep original
      } else if (uri.startsWith(this.metadata.uri!)) {
        const placeholderName = getUriEnd(uri)!;
        const v = values[placeholderName];
        return typeof v === "string" ? v : uri; // Replace with value or keep original
      }
      return uri;
    };

    const shouldPlaceholderBeLiteral = (placeholderId: string): boolean => {
      const placeholderField = this.fields.find((f) => f.id === placeholderId);
      const placeholderType = placeholderField?.type as
        | PlaceholderType
        | undefined;
      return (
        placeholderType === PlaceholderType.LITERAL ||
        placeholderType === PlaceholderType.LONG_LITERAL ||
        placeholderType === PlaceholderType.TEXT_PLACEHOLDER ||
        placeholderType === PlaceholderType.VALUE
      );
    };

    const createLiteralFromTemplate = (t: RDFT.Literal) => {
      if (t.language) return literal(t.value, t.language);
      if (t.datatype) return literal(t.value, namedNode(t.datatype.value));
      return literal(t.value);
    };

    const createSubjectTerm = (
      templateTerm: RDFT.Quad_Subject,
      values: Record<string, string>,
    ): RDFT.Quad_Subject => {
      if (templateTerm.termType === "BlankNode") {
        return blankNode(templateTerm.value);
      }

      const placeholderId = templateTerm.value;
      const replacedValue = getPlaceholderValue(placeholderId, values);
      if (shouldPlaceholderBeLiteral(placeholderId)) {
        throw new Error(
          `Placeholder '${placeholderId}' is a literal placeholder but is used as a subject`,
        );
      }
      return namedNode(replacedValue);
    };

    const createPredicateTerm = (
      templateTerm: RDFT.Quad_Predicate,
      values: Record<string, string>,
    ): RDFT.Quad_Predicate => {
      const placeholderId = templateTerm.value;
      const replacedValue = getPlaceholderValue(placeholderId, values);
      if (shouldPlaceholderBeLiteral(placeholderId)) {
        throw new Error(
          `Placeholder '${placeholderId}' is a literal placeholder but is used as a predicate`,
        );
      }
      return namedNode(replacedValue);
    };

    const createObjectTerm = (
      templateTerm: RDFT.Quad_Object,
      values: Record<string, string>,
    ): RDFT.Quad_Object => {
      if (templateTerm.termType === "Literal") {
        return createLiteralFromTemplate(templateTerm);
      }

      if (templateTerm.termType === "BlankNode") {
        return blankNode(templateTerm.value);
      }

      const placeholderId = templateTerm.value;
      const replacedValue = getPlaceholderValue(placeholderId, values);
      return shouldPlaceholderBeLiteral(placeholderId)
        ? literal(replacedValue)
        : namedNode(replacedValue);
    };

    const outSub = namedNode(newNanopubUri);
    const assertionGraph = namedNode(newNanopubUri + "assertion");
    const provenanceGraph = namedNode(newNanopubUri + "provenance");
    const pubinfoGraph = namedNode(newNanopubUri + "pubinfo");

    // ---- 1. HEAD graph, standard: declares RDF type, and points to the other three graphs

    const headGraph = namedNode(newNanopubUri + "Head");
    outputStore.addQuad(
      outSub,
      NS.RDF("type"),
      NS.NP("Nanopublication"),
      headGraph,
    );
    outputStore.addQuad(
      outSub,
      NS.NP("hasAssertion"),
      assertionGraph,
      headGraph,
    );
    outputStore.addQuad(
      outSub,
      NS.NP("hasProvenance"),
      provenanceGraph,
      headGraph,
    );
    outputStore.addQuad(
      outSub,
      NS.NP("hasPublicationInfo"),
      pubinfoGraph,
      headGraph,
    );

    // ---- 2. ASSERTION graph, created by processing template statements

    // Process each statement from the template
    for (const [statementId, statement] of this.statements) {
      const addStatement = (s: Statement, values: Record<string, string>) => {
        const subject = createSubjectTerm(s.subject, values);
        const predicate = createPredicateTerm(s.predicate, values);
        const object = createObjectTerm(s.object, values);
        outputStore.addQuad(subject, predicate, object, assertionGraph);
      };
      const statementName = getUriEnd(statementId) || statement.id;
      if (
        isRepeatable(statement) &&
        Array.isArray(placeholderValues[statementName])
      ) {
        for (const values of placeholderValues[statementName]) {
          addStatement(statement, values);
        }
      } else {
        addStatement(statement, placeholderValues);
      }
    }

    const orcidNode = namedNode(cleanOrcidUri(pubData.orcid));

    // ---- 3. PROVENANCE graph

    outputStore.addQuad(
      assertionGraph,
      NS.PROV("wasAttributedTo"),
      orcidNode,
      provenanceGraph,
    );

    // ---- 4. PUBINFO graph

    if (pubData.isExample) {
      outputStore.addQuad(
        outSub,
        NS.RDF("type"),
        NS.NPX("ExampleNanopub"),
        pubinfoGraph,
      );
    }

    // Add creator info
    if (pubData.name) {
      outputStore.addQuad(
        orcidNode,
        NS.FOAF("name"),
        literal(pubData.name),
        pubinfoGraph,
      );
    }

    // Add signedBy, the rest of the sig will be generated later
    outputStore.addQuad(
      namedNode(newSubUri + "sig"),
      NS.NPX("signedBy"),
      orcidNode,
      pubinfoGraph,
    );

    outputStore.addQuad(outSub, NS.DCT("creator"), orcidNode, pubinfoGraph);

    // Add other metadata
    const now = new Date().toISOString();
    outputStore.addQuad(
      outSub,
      NS.DCT("created"),
      literal(pubData.timestamp?.toISOString() ?? now, NS.XSD("dateTime")),
      pubinfoGraph,
    );
    //TODO: should the license default to  CC BY 4.0?
    outputStore.addQuad(
      outSub,
      NS.DCT("license"),
      namedNode(
        pubData.license ?? "https://creativecommons.org/licenses/by/4.0/",
      ),
      pubinfoGraph,
    );

    // Add nanopub types from template
    if (this.templateMetadata.targetNanopubType) {
      outputStore.addQuad(
        outSub,
        NS.NPX("hasNanopubType"),
        namedNode(this.templateMetadata.targetNanopubType),
        pubinfoGraph,
      );
    }

    outputStore.addQuad(
      outSub,
      NS.NPX("wasCreatedAt"),
      namedNode("https://platform.sciencelive4all.org"),
      pubinfoGraph,
    );

    // Add label based on template pattern
    const label = this.templateMetadata.targetlabelPattern
      ? this.templateMetadata.targetlabelPattern.replaceAll(
          /\$\{([^}]+)\}/g,
          (match, placeholder) => {
            const value = placeholderValues[placeholder];
            if (!value) return match;

            // If the value looks like a URI, use getUriEnd, otherwise use the literal value
            if (value.startsWith("http")) {
              return getUriEnd(value) || value;
            }
            return value;
          },
        )
      : "NP created using " +
        (this.metadata.title || "Nanopublication Template");

    outputStore.addQuad(outSub, NS.RDFS("label"), literal(label), pubinfoGraph);

    // Add template reference
    const templateUri = this.metadata.uri;
    if (templateUri) {
      outputStore.addQuad(
        outSub,
        NS.NPTs("wasCreatedFromTemplate"),
        namedNode(templateUri),
        pubinfoGraph,
      );
    }

    // Serialize to TRIG format
    // Dont need to add prefixes at this point, they will be sorted out by sign() function
    const writer = new Writer();
    let trigOutput = "";
    const quads = outputStore.getQuads(null, null, null, null);
    writer.addQuads(quads);
    writer.end((error: any, result: string) => {
      if (error) {
        throw new Error(`Failed to serialize TRIG: ${error}`);
      }
      trigOutput = result;
    });

    const signed = await sign(
      trigOutput,
      privateKey,
      pubData.orcid,
      pubData.name,
    );

    return signed;
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
      targetlabelPattern: [NS.NPT("hasNanopubLabelPattern")],
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

    // ---- 2. Get the "Placeholders" and their attributes (user-entered fields)
    const placeholderPropertyMap = {
      // type: [(q: Quad) => q.object.value.endsWith("Placeholder")],
      type: [NS.RDF("type")],
      types_$array: [NS.RDF("type")],
      name: [NS.RDFS("label")],
      description: [NS.DCT("description")],
      possibleValuesFrom: [NS.NPT("possibleValuesFrom")],
      hasRegex: [NS.NPT("hasRegex")],
      hasPrefix: [NS.NPT("hasPrefix")],
      hasPrefixLabel: [NS.NPT("hasPrefixLabel")],
    };
    type Placeholder = {
      type: string;
      types: string[];
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
      true,
    );

    // ---- 4. match up properties of statements to contained placeholders
    for (const [pk, pv] of placeholders) {
      // Check whether required/optional
      // It's optional if it appears only in optional statements and doesn't appear in any non-optional statements
      const required = Object.values(statements).some(
        (q: Statement) =>
          termValue(q.object as unknown as RDFT.Term) === pk && isOptional(q),
      );

      // Get options for restricted choice placeholders
      let options: { name: string; description: string; uri?: string }[] = [];

      if (pv.possibleValuesFrom) {
        options = await fetchPossibleValuesFromQuads(pv.possibleValuesFrom);
      }

      fields.push({
        id: pk,
        label: pv.name,
        type: getUriEnd(pv.type) ?? pv.type,
        description: pv.description,
        regex: pv.hasRegex,
        options: options?.length > 0 ? options : undefined,
        required, // Placeholders are required by default, so if this is undefined, its still required
      });
    }
    this.fields = fields;
    this.statements = statements;
    this.templateMetadata = {
      description: props.description ?? "-",
      targetlabelPattern: props.targetlabelPattern,
      targetNanopubType: props.targetNanopubType,
    };
  }
}

/**
 * Add type-specific configuration from TemplateField to baseField
 */
function applyTypeSpecificFieldConfig(
  field: TemplateField,
  baseField: FieldConfig,
) {
  switch (field.type) {
    case PlaceholderType.URI:
    case PlaceholderType.AUTO_ESCAPE_URI:
    case PlaceholderType.EXTERNAL_URI:
    case PlaceholderType.TRUSTY_URI:
      baseField.type = "url";
      baseField.placeholder = "https://... or other URL";
      break;

    case PlaceholderType.GUIDED_CHOICE:
      // TODO: this actually involves a text entry field and an API call, not a combobox
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

    case PlaceholderType.LONG_LITERAL:
    case PlaceholderType.INTRODUCED_RESOURCE:
      baseField.type = "textarea";
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

    applyTypeSpecificFieldConfig(field, baseField);
    return baseField;
  });
}

/**
 * Convert template statements to Formedible field configurations
 *
 * This is an alternative to to the above templateFieldsToFormedible() which presents
 * all the template output statements in a complete form.
 */
export function templateStatementsToFormedible(
  fields: TemplateField[],
  statements: Statements,
): FieldConfig[] {
  // Go through each statement, create a dynamic field where

  const fieldConfig: FieldConfig[] = [];

  for (const [k, s] of statements.entries()) {
    const statement = s as Statement;

    const makeFieldFrom = (part: "subject" | "predicate" | "object") => {
      const v = termValue(statement[part] as unknown as RDFT.Term);
      const objectField = fields.find((f) => f.id === v);
      let baseField: FieldConfig;
      if (objectField) {
        baseField = {
          name: getUriEnd(objectField.id) ?? objectField.id,
          type: getFormedibleFieldType(objectField.type as PlaceholderType),
          label: objectField.label,
          placeholder: objectField.placeholder,
          description: objectField.description,
          required: objectField.required,
          section: { title: `Statement ${getUriEnd(k)}` },
        };

        applyTypeSpecificFieldConfig(objectField, baseField);
      } else {
        // Render constant values (non-placeholders) as a read-only field.
        // Use a stable, prefixed name to avoid collisions with placeholder names.
        baseField = {
          name: `_const_${getUriEnd(k) ?? k}_${part}`,
          type: "static",
          label: part,
          required: false,
          defaultValue: v,
          section: { title: `Statement ${getUriEnd(k)}` },
          // component: FieldWrapper,
        };
      }
      return baseField;
    };

    const formedibleFields = [
      makeFieldFrom("subject"),
      makeFieldFrom("predicate"),
      makeFieldFrom("object"),
    ];

    // If statement was detected as repeatable (a RepeatableStatement),
    // render it as an array field
    if (isRepeatable(statement)) {
      let repeatableField: FieldConfig;
      repeatableField = {
        type: "array",
        name: getUriEnd(k) ?? "statement",
        section: { title: `Statement ${getUriEnd(k)}` },
        gridColumnSpan: 3,
        defaultValue: [],
        arrayConfig: {
          defaultValue: {},
          minItems: 1,
          itemType: "object",
          itemLabel: "Item",
          objectConfig: {
            fields: formedibleFields,
          },
        },
      };
      fieldConfig.push(repeatableField);
    } else {
      fieldConfig.push(...formedibleFields);
    }
  }

  return fieldConfig;
}

/**
 * Convert placeholder type to Formedible field type
 */
function getFormedibleFieldType(placeholderType: PlaceholderType): string {
  switch (placeholderType) {
    case PlaceholderType.URI:
    case PlaceholderType.AUTO_ESCAPE_URI:
    case PlaceholderType.EXTERNAL_URI:
    case PlaceholderType.TRUSTY_URI:
      return "url";
    case PlaceholderType.GUIDED_CHOICE:
    case PlaceholderType.RESTRICTED_CHOICE:
      return "combobox";
    case PlaceholderType.TEXT_PLACEHOLDER:
    case PlaceholderType.LITERAL:
      return "text";
    case PlaceholderType.LONG_LITERAL:
    case PlaceholderType.INTRODUCED_RESOURCE:
      return "textarea";
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
    const fieldName = getUriEnd(field.id) ?? field.id; //field.id.replace(/[^a-zA-Z0-9]/g, "_");
    let fieldSchema: z.ZodTypeAny;

    // Base schema based on type
    switch (field.type) {
      case PlaceholderType.URI:
      case PlaceholderType.AUTO_ESCAPE_URI:
      case PlaceholderType.EXTERNAL_URI:
        fieldSchema = regexUrl(field.regex);
        break;

      case PlaceholderType.TRUSTY_URI:
        // TODO: for trusty URI, we should do additional validation
        fieldSchema = regexUrl(field.regex);
        break;

      case PlaceholderType.GUIDED_CHOICE:
      case PlaceholderType.RESTRICTED_CHOICE:
        fieldSchema = regexString(field.regex);
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options.map((o) => o.name));
        }
        break;

      case PlaceholderType.TEXT_PLACEHOLDER:
      case PlaceholderType.LITERAL:
      case PlaceholderType.LONG_LITERAL:
      case PlaceholderType.INTRODUCED_RESOURCE:
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
