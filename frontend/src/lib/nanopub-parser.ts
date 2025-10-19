import type { 
  ParsedNanopub, 
  ParsedAssertion,
  ParsedProvenance,
  ParsedPubInfo,
  NanopubMetadata 
} from '@/types/nanopub';

// ============= LABEL FETCHER =============
class LabelFetcher {
  private cache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  async getLabel(uri: string, localLabels: Record<string, string> = {}): Promise<string> {
  // Check local labels first
  if (localLabels[uri]) {
    return localLabels[uri];
  }

  // Check cache
  if (this.cache.has(uri)) {
    return this.cache.get(uri)!;
  }

  // FOR NOW: Skip web fetching, just parse URIs
  // TODO: Enable web fetching via API proxy later
  const parsedLabel = this.parseUriLabel(uri);
  this.cache.set(uri, parsedLabel);
  return parsedLabel;

  /* Original web fetching code - commented out for now
  // Check if request is pending
  if (this.pendingRequests.has(uri)) {
    return this.pendingRequests.get(uri)!.then(label => label || this.parseUriLabel(uri));
  }

  // Create new request
  const requestPromise = this.fetchLabelFromWeb(uri);
  this.pendingRequests.set(uri, requestPromise);

  try {
    const label = await requestPromise;
    if (label) {
      this.cache.set(uri, label);
      return label;
    }
  } finally {
    this.pendingRequests.delete(uri);
  }

  // Fallback to parsing URI
  const parsedLabel = this.parseUriLabel(uri);
  this.cache.set(uri, parsedLabel);
  return parsedLabel;
  */
}

  private async fetchLabelFromWeb(uri: string): Promise<string | null> {
    try {
      const response = await fetch(uri, {
        headers: {
          'Accept': 'application/ld+json, application/json'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();

      // Try different label predicates
      if (data['rdfs:label']) {
        const label = data['rdfs:label'];
        return typeof label === 'object' ? label['@value'] : label;
      }

      if (data['@graph']) {
        for (const node of data['@graph']) {
          if (node['@id'] === uri && node['rdfs:label']) {
            return node['rdfs:label'];
          }
        }
      }
    } catch (e) {
      // Silently fail
    }
    return null;
  }

  parseUriLabel(uri: string): string {
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    label = label
      .replace(/([A-Z])/g, ' $1')
      .replace(/^has/, 'Has')
      .replace(/[_-]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    
    label = label.charAt(0).toUpperCase() + label.slice(1);
    
    return label;
  }

  async batchGetLabels(uris: string[], localLabels: Record<string, string> = {}): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const promises = uris.map(async uri => {
      const label = await this.getLabel(uri, localLabels);
      results.set(uri, label);
    });
    
    await Promise.all(promises);
    return results;
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// ============= NANOPUB PARSER =============
export class NanopubParser {
  private content: string;
  private templateContent: string;
  private prefixes: Record<string, string> = {};
  private data: {
    assertions: any[];
    provenance: any[];
    pubinfo: any[];
  } = {
    assertions: [],
    provenance: [],
    pubinfo: []
  };
  private template: any = null;
  private labelFetcher: LabelFetcher;

  constructor(content: string, templateContent: string = '') {
    this.content = content;
    this.templateContent = templateContent;
    this.labelFetcher = new LabelFetcher();
  }

  async parseWithLabels(): Promise<ParsedNanopub> {
    console.log('=== parseWithLabels START ===');

    this.extractPrefixes();
    console.log('Prefixes extracted:', Object.keys(this.prefixes).length);
    
    if (this.templateContent) {
      console.log('Parsing template...');
      // Template processor would go here
      // For now, we'll skip it
    }
    
    console.log('Parsing statements...');
    this.parseAllStatements();
    
    console.log('Fetching labels...');
    return await this.formatForPublication();
  }

  private extractPrefixes(): void {
    const lines = this.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('@prefix')) {
        const match = trimmed.match(/@prefix\s+(\S+):\s+<([^>]+)>/);
        if (match) {
          this.prefixes[match[1]] = match[2];
        }
      }
    }
  }

  private parseAllStatements(): void {
    const lines = this.content.split('\n');
    let currentGraph = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('{')) {
        // Extract graph name
        if (trimmed.includes('assertion')) currentGraph = 'assertion';
        else if (trimmed.includes('provenance')) currentGraph = 'provenance';
        else if (trimmed.includes('pubinfo')) currentGraph = 'pubinfo';
        continue;
      }
      
      if (trimmed.includes('}')) {
        currentGraph = '';
        continue;
      }
      
      // Parse triple
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('@')) {
        const triple = this.parseTriple(trimmed);
        if (triple) {
          if (currentGraph === 'assertion') {
            this.data.assertions.push(triple);
          } else if (currentGraph === 'provenance') {
            this.data.provenance.push(triple);
          } else if (currentGraph === 'pubinfo') {
            this.data.pubinfo.push(triple);
          }
        }
      }
    }
  }

  private parseTriple(line: string): any | null {
    // Simple triple parsing
    const match = line.match(/(\S+)\s+(\S+)\s+(.+?)\s*[;.]$/);
    if (!match) return null;

    return {
      subject: this.expandPrefix(match[1]),
      predicate: this.expandPrefix(match[2]),
      object: this.parseObject(match[3])
    };
  }

  private expandPrefix(term: string): string {
    if (term.startsWith('<') && term.endsWith('>')) {
      return term.slice(1, -1);
    }
    
    const [prefix, local] = term.split(':');
    if (this.prefixes[prefix]) {
      return this.prefixes[prefix] + (local || '');
    }
    
    return term;
  }

  private parseObject(obj: string): any {
    obj = obj.trim();
    
    if (obj.startsWith('<') && obj.endsWith('>')) {
      return { type: 'uri', value: obj.slice(1, -1) };
    }
    
    if (obj.startsWith('"')) {
      return { type: 'literal', value: obj };
    }
    
    return { type: 'uri', value: this.expandPrefix(obj) };
  }

  private async formatForPublication(): Promise<ParsedNanopub> {
    // Collect all URIs that need labels
    const uris: string[] = [];
    
    this.data.assertions.forEach((triple: any) => {
      if (triple.subject) uris.push(triple.subject);
      if (triple.predicate) uris.push(triple.predicate);
      if (triple.object?.type === 'uri') uris.push(triple.object.value);
    });

    // Fetch labels in batch
    const labels = await this.labelFetcher.batchGetLabels([...new Set(uris)]);

    // Format assertions with labels
    const assertions: ParsedAssertion[] = this.data.assertions.map((triple: any) => ({
      subject: triple.subject,
      predicate: triple.predicate,
      object: triple.object?.value || triple.object,
      subjectLabel: labels.get(triple.subject) || this.labelFetcher.parseUriLabel(triple.subject),
      predicateLabel: labels.get(triple.predicate) || this.labelFetcher.parseUriLabel(triple.predicate),
      objectLabel: triple.object?.type === 'uri' 
        ? (labels.get(triple.object.value) || this.labelFetcher.parseUriLabel(triple.object.value))
        : triple.object?.value
    }));

    // Extract metadata
    const metadata: NanopubMetadata = this.extractMetadata();

    // Format provenance
    const provenance: ParsedProvenance = {
      other: this.data.provenance
    };

    // Format pubinfo
    const publicationInfo: ParsedPubInfo = {
      other: this.data.pubinfo
    };

    return {
      uri: this.extractNanopubUri(),
      metadata,
      assertions,
      provenance,
      publicationInfo,
      rawTriples: {
        assertion: this.data.assertions,
        provenance: this.data.provenance,
        pubinfo: this.data.pubinfo
      }
    };
  }

  private extractMetadata(): NanopubMetadata {
    const metadata: NanopubMetadata = {};
    
    // Extract from pubinfo
    this.data.pubinfo.forEach((triple: any) => {
      const pred = triple.predicate.split(/[#\/]/).pop() || '';
      const obj = triple.object?.value || triple.object;
      
      if (pred === 'created') metadata.created = obj;
      if (pred === 'creator') metadata.creator = obj;
      if (pred === 'license') metadata.license = obj;
    });
    
    return metadata;
  }

  private extractNanopubUri(): string {
    // Try to find nanopub URI in head section
    return 'http://example.org/nanopub/temp';
  }

  extractTemplateUri(): string | null {
    // Look for template reference in provenance
    for (const triple of this.data.provenance) {
      if (triple.predicate.includes('wasGeneratedBy') || triple.predicate.includes('generatedFromTemplate')) {
        return triple.object?.value || triple.object;
      }
    }
    return null;
  }
}

/**
 * Main export function to parse nanopub content
 */
export async function parseNanopub(trigContent: string, templateContent: string = ''): Promise<ParsedNanopub> {
  const parser = new NanopubParser(trigContent, templateContent);
  return await parser.parseWithLabels();
}
