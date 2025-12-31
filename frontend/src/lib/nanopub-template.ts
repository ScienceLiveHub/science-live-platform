import { FieldWrapper } from "@/components/formedible/fields/base-field-wrapper";
import * as RDFT from "@rdfjs/types";
import { DataFactory, Store, Writer } from "n3";
import { sign } from "nanopub-js";
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

const { namedNode, literal } = DataFactory;

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
  types?: string[];
  subject: string;
  predicate: string;
  object: string;
};
type Statements = Map<string, Statement>;

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
    values: Record<string, string>,
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
    // TODO: Generate trusty URI for the new nanopub
    const baseUri = pubData.baseUri ?? "https://w3id.org/np/";
    const newNanopubUri = baseUri + "placeholder"; // Blank space is the placeholder for the hash later on
    const newSubUri = `${newNanopubUri}`;

    // Create a new store for the generated nanopub
    const outputStore = new Store();

    // Helper function to replace placeholders in URIs
    const replacePlaceholder = (uri: string): string => {
      // Replace sub: placeholders with values
      if (uri.startsWith("sub:")) {
        const placeholderName = uri.substring(4); // Remove "sub:" prefix
        return values[placeholderName] || uri; // Replace with value or keep original
      } else if (uri.startsWith(this.metadata.uri!)) {
        const placeholderName = getUriEnd(uri);
        return values[placeholderName!] || uri; // Replace with value or keep original
      }
      return uri;
    };

    // Helper function to create a term with placeholder replacement
    const createTerm = (value: string): RDFT.NamedNode<string> => {
      const replacedValue = replacePlaceholder(value);
      return namedNode(replacedValue);
    };

    const outSub = namedNode(newNanopubUri);
    const assertionGraph = namedNode(newNanopubUri + "assertion");
    const provenanceGraph = namedNode(newNanopubUri + "provenance");
    const pubinfoGraph = namedNode(newNanopubUri + "pubinfo");

    // 1. Generate Head graph
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

    // 2. Generate Assertion graph by processing template statements

    // Process each statement from the template
    for (const [_statementId, statement] of this.statements) {
      const subject = createTerm(statement.subject);
      const predicate = createTerm(statement.predicate);
      const object = createTerm(statement.object);

      outputStore.addQuad(subject, predicate, object, assertionGraph);
    }

    // 3. Generate Provenance graph
    if (pubData.orcid) {
      outputStore.addQuad(
        assertionGraph,
        NS.PROV("wasAttributedTo"),
        namedNode(cleanOrcidUri(pubData.orcid)),
        provenanceGraph,
      );
    }

    // 4. Generate Pubinfo graph

    if (pubData.isExample) {
      outputStore.addQuad(
        outSub,
        NS.RDF("type"),
        NS.NPX("ExampleNanopub"),
        pubinfoGraph,
      );
    }

    // Add creator info
    if (pubData.orcid && pubData.name) {
      outputStore.addQuad(
        namedNode(cleanOrcidUri(pubData.orcid)),
        NS.FOAF("name"),
        literal(pubData.name),
        pubinfoGraph,
      );
    }

    // Add signedBy, the rest of the sig will be generated later
    if (pubData.orcid) {
      outputStore.addQuad(
        namedNode(newSubUri + "sig"),
        NS.NPX("signedBy"),
        namedNode(cleanOrcidUri(pubData.orcid)),
        pubinfoGraph,
      );
    }

    // Add metadata
    if (pubData.orcid) {
      outputStore.addQuad(
        outSub,
        NS.DCT("creator"),
        namedNode(cleanOrcidUri(pubData.orcid)),
        pubinfoGraph,
      );
    }
    const now = new Date().toISOString();
    outputStore.addQuad(
      outSub,
      NS.DCT("created"),
      literal(pubData.timestamp?.toISOString() ?? now, NS.XSD("dateTime")),
      pubinfoGraph,
    );
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
            const value = values[placeholder];
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
    const templateUri = this.prefixes["this"] || this.graphUris.head || "";
    if (templateUri) {
      outputStore.addQuad(
        outSub,
        NS.NPTs("wasCreatedFromTemplate"),
        namedNode(templateUri),
        pubinfoGraph,
      );
    }

    // TODO: or just use DEFAULT_PREFIXES?  Allow user customization? or auto-detect?
    const prefixes = {
      this: newNanopubUri,
      sub: newSubUri,
      rdfs: NS.RDFS("").value,
      xsd: NS.XSD("").value,
      np: NS.NP("").value,
      npx: NS.NPX("").value,
      dcterms: NS.DCT("").value,
      prov: NS.PROV("").value,
      foaf: NS.FOAF("").value,
      orcid: "https://orcid.org/",
    };

    // Serialize to TRIG format
    const writer = new Writer();

    let trigOutput = "";
    const quads = outputStore.getQuads(null, null, null, null);
    // Write placeholder RDF
    // TODO: replace the below code block with proper code to output normalized RDF and generate hash
    // ----------------------------------------------------
    // const hash = await makeHash(quads);
    // const trustyHash = "RA" + hash; // "RA" is the type code for RDF content
    // const actualNanopubUri = `${baseUri}${trustyHash}`;
    // const actualSubUri = `${baseUri}${trustyHash}/`;

    // prefixes.this = actualNanopubUri;
    // prefixes.sub = actualSubUri;

    writer.addPrefixes(prefixes);

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

    // ----------------------------------------------------

    return signed.signedRdf;
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
        // multiple: !!repeatableQuad,
        required, // Placeholders are required by default
        // placeholder: `Enter ${label.toLowerCase()}`,
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
      const objectField = fields.find((f) => f.id === statement[part]);
      let baseField: FieldConfig;
      if (objectField) {
        baseField = {
          name: getUriEnd(objectField.id) ?? objectField.id, //objectField.id.replace(/[^a-zA-Z0-9]/g, "_"), // Sanitize name for form
          type: getFormedibleFieldType(objectField.type as PlaceholderType),
          label: objectField.label,
          placeholder: objectField.placeholder,
          description: objectField.description,
          required: objectField.required,
          section: { title: `Statement ${getUriEnd(k)}` },
        };
        applyTypeSpecificFieldConfig(objectField, baseField);
      } else {
        // TODO: this ends up creating something akin to a read-only "label" for this field.
        //       There should be a much beter way to do this, but it suffices for now
        baseField = {
          name: getUriEnd(statement[part])!,
          type: "help", // Should be static text/label
          label: getUriEnd(statement[part])!,
          required: false,
          section: { title: `Statement ${getUriEnd(k)}` },
          component: FieldWrapper,
        };
      }
      return baseField;
    };
    fieldConfig.push(makeFieldFrom("subject"));
    fieldConfig.push(makeFieldFrom("predicate"));
    fieldConfig.push(makeFieldFrom("object"));
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
