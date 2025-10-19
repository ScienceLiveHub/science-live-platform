// Nanopublication structure
export interface Nanopublication {
  uri: string;
  assertion: Triple[];
  provenance: Triple[];
  pubinfo: Triple[];
  head: Triple[];
  metadata?: NanopubMetadata;
}

// RDF Triple
export interface Triple {
  subject: string;
  predicate: string;
  object: string | LiteralObject;
  graph?: string;
}

// Literal with datatype
export interface LiteralObject {
  value: string;
  datatype?: string;
  language?: string;
}

// Parsed metadata
export interface NanopubMetadata {
  title?: string;
  description?: string;
  authors?: string[];
  created?: string;
  creator?: string;
  license?: string;
  type?: string;
  keywords?: string[];
}

// Display modes
export type DisplayMode = 'technical' | 'simplified' | 'beginner';

// Parsed nanopub for display
export interface ParsedNanopub {
  uri: string;
  metadata: NanopubMetadata;
  assertions: ParsedAssertion[];
  provenance: ParsedProvenance;
  publicationInfo: ParsedPubInfo;
  rawTriples: {
    assertion: Triple[];
    provenance: Triple[];
    pubinfo: Triple[];
  };
}

export interface ParsedAssertion {
  subject: string;
  predicate: string;
  object: string;
  subjectLabel?: string;
  predicateLabel?: string;
  objectLabel?: string;
}

export interface ParsedProvenance {
  wasAttributedTo?: string;
  wasGeneratedBy?: string;
  wasDerivedFrom?: string[];
  generatedAtTime?: string;
  other: any[];
}

export interface ParsedPubInfo {
  creator?: string;
  created?: string;
  license?: string;
  other: any[];
}
