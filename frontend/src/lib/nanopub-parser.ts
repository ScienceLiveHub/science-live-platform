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

  async getLabel(uri: string): Promise<string> {
    if (this.cache.has(uri)) {
      return this.cache.get(uri)!;
    }

    const parsedLabel = this.parseUriLabel(uri);
    this.cache.set(uri, parsedLabel);
    return parsedLabel;
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

  async batchGetLabels(uris: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    for (const uri of uris) {
      const label = await this.getLabel(uri);
      results.set(uri, label);
    }
    return results;
  }
}

// ============= SIMPLE NANOPUB PARSER =============
export class NanopubParser {
  private content: string;
  private prefixes: Record<string, string> = {};
  private graphs: Record<string, any[]> = {
    assertion: [],
    provenance: [],
    pubinfo: [],
    head: []
  };
  private labelFetcher: LabelFetcher;
  private nanopubUri: string = '';

  constructor(content: string) {
    this.content = content;
    this.labelFetcher = new LabelFetcher();
  }

  async parseWithLabels(): Promise<ParsedNanopub> {
    console.log('=== PARSING START ===');
    console.log('Content length:', this.content.length);
    console.log('First 200 chars:', this.content.substring(0, 200));

    // Extract prefixes
    this.extractPrefixes();
    console.log('Prefixes:', this.prefixes);
    
    // Parse into graphs
    this.parseGraphs();
    
    console.log('=== PARSE RESULTS ===');
    console.log('Assertions:', this.graphs.assertion.length);
    console.log('Provenance:', this.graphs.provenance.length);
    console.log('Pubinfo:', this.graphs.pubinfo.length);
    console.log('Nanopub URI:', this.nanopubUri);

    if (this.graphs.assertion.length > 0) {
      console.log('Sample assertion:', this.graphs.assertion[0]);
    }

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
          console.log('Found prefix:', match[1], '=', match[2]);
        }
      }
    }
  }

private parseGraphs(): void {
  const lines = this.content.split('\n');
  let currentGraphName = '';
  let currentGraphType: 'assertion' | 'provenance' | 'pubinfo' | 'head' | null = null;
  let graphContent: string[] = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, comments, and prefixes
    if (!line || line.startsWith('#') || line.startsWith('@')) continue;

    // Detect graph start
    if (line.includes('{') && braceDepth === 0) {
      // Extract graph name (everything before the {)
      const graphNamePart = line.split('{')[0].trim();
      currentGraphName = this.expandUri(graphNamePart);
      
      console.log('=== Found graph:', currentGraphName);
      
      // Determine graph type
      const lowerName = currentGraphName.toLowerCase();
      if (lowerName.includes('assertion') || lowerName.endsWith('#assertion')) {
        currentGraphType = 'assertion';
      } else if (lowerName.includes('provenance') || lowerName.endsWith('#provenance')) {
        currentGraphType = 'provenance';
      } else if (lowerName.includes('pubinfo') || lowerName.endsWith('#pubinfo')) {
        currentGraphType = 'pubinfo';
      } else if (lowerName.includes('head') || lowerName.endsWith('#head')) {
        currentGraphType = 'head';
        if (currentGraphName.includes('/np/')) {
          this.nanopubUri = currentGraphName.split('#')[0];
        }
      } else {
        currentGraphType = null;
      }
      
      console.log('Graph type:', currentGraphType);
      
      braceDepth = 1;
      graphContent = [];
      
      // Check if there's content after the { on the same line
      const afterBrace = line.split('{')[1];
      if (afterBrace && afterBrace.trim() && !afterBrace.trim().startsWith('}')) {
        graphContent.push(afterBrace);
      }
      
      continue;
    }

    // Track brace depth
    if (line.includes('{')) braceDepth++;
    if (line.includes('}')) braceDepth--;

    // Detect graph end
    if (braceDepth === 0 && currentGraphType) {
      // Parse the accumulated content
      const contentStr = graphContent.join('\n');
      console.log('Graph content:', contentStr.substring(0, 100));
      
      if (contentStr.trim()) {
        const triples = this.parseTriples(contentStr);
        console.log('Found', triples.length, 'triples in', currentGraphType);
        this.graphs[currentGraphType].push(...triples);
      }
      
      currentGraphType = null;
      currentGraphName = '';
      graphContent = [];
      continue;
    }

    // Accumulate graph content
    if (braceDepth > 0 && currentGraphType) {
      graphContent.push(line);
    }
  }
}

  private parseTriples(content: string): any[] {
    const triples: any[] = [];
    
    // Split by lines and process
    const lines = content.split('\n');
    let currentSubject = '';
    let currentPredicate = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Remove trailing punctuation
      let statement = trimmed.replace(/[;,.]$/, '').trim();
      if (!statement) continue;

      // Check if this starts a new statement (has a subject)
      if (!statement.startsWith(';') && !statement.startsWith(',')) {
        // Parse as full triple: subject predicate object
        const parts = this.smartSplit(statement);
        
        if (parts.length >= 3) {
          currentSubject = this.expandUri(parts[0]);
          currentPredicate = this.expandUri(parts[1]);
          const object = this.parseObject(parts.slice(2).join(' '));
          
          triples.push({
            subject: currentSubject,
            predicate: currentPredicate,
            object
          });
          
          console.log('Parsed triple:', currentSubject, currentPredicate, object);
        }
      } else if (statement.startsWith(';')) {
        // Same subject, new predicate
        statement = statement.substring(1).trim();
        const parts = this.smartSplit(statement);
        
        if (parts.length >= 2 && currentSubject) {
          currentPredicate = this.expandUri(parts[0]);
          const object = this.parseObject(parts.slice(1).join(' '));
          
          triples.push({
            subject: currentSubject,
            predicate: currentPredicate,
            object
          });
        }
      } else if (statement.startsWith(',')) {
        // Same subject and predicate, new object
        statement = statement.substring(1).trim();
        const object = this.parseObject(statement);
        
        if (currentSubject && currentPredicate) {
          triples.push({
            subject: currentSubject,
            predicate: currentPredicate,
            object
          });
        }
      }
    }
    
    return triples;
  }

  private smartSplit(statement: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let inBrackets = false;

    for (let i = 0; i < statement.length; i++) {
      const char = statement[i];

      if (char === '"' && statement[i - 1] !== '\\') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '<' && !inQuotes) {
        inBrackets = true;
        current += char;
      } else if (char === '>' && inBrackets) {
        inBrackets = false;
        current += char;
      } else if ((char === ' ' || char === '\t') && !inQuotes && !inBrackets) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  private expandUri(term: string): string {
    if (!term) return term;
    
    term = term.trim();
    
    // Already expanded
    if (term.startsWith('<') && term.endsWith('>')) {
      return term.slice(1, -1);
    }
    
    if (term.startsWith('http://') || term.startsWith('https://')) {
      return term;
    }

    // Blank node
    if (term.startsWith('_:')) {
      return term;
    }

    // Expand prefix
    const colonIndex = term.indexOf(':');
    if (colonIndex > 0) {
      const prefix = term.substring(0, colonIndex);
      const local = term.substring(colonIndex + 1);
      
      if (this.prefixes[prefix]) {
        return this.prefixes[prefix] + local;
      }
    }

    return term;
  }

  private parseObject(obj: string): any {
    obj = obj.trim();
    
    // URI in brackets
    if (obj.startsWith('<') && obj.endsWith('>')) {
      return { type: 'uri', value: obj.slice(1, -1) };
    }

    // Literal
    if (obj.startsWith('"')) {
      const endQuote = obj.lastIndexOf('"');
      if (endQuote > 0) {
        const value = obj.substring(1, endQuote);
        const remainder = obj.substring(endQuote + 1);

        let datatype = undefined;
        if (remainder.includes('^^')) {
          const match = remainder.match(/\^\^<?([^>]+)>?/);
          if (match) datatype = match[1];
        }

        return { type: 'literal', value, datatype };
      }
    }

    // Prefixed URI
    const expanded = this.expandUri(obj);
    return { type: 'uri', value: expanded };
  }

  private async formatForPublication(): Promise<ParsedNanopub> {
    // Collect URIs
    const allUris = new Set<string>();
    
    [...this.graphs.assertion, ...this.graphs.provenance, ...this.graphs.pubinfo].forEach(triple => {
      if (triple.subject && !triple.subject.startsWith('_:')) allUris.add(triple.subject);
      if (triple.predicate) allUris.add(triple.predicate);
      if (triple.object?.type === 'uri') allUris.add(triple.object.value);
    });

    const labels = await this.labelFetcher.batchGetLabels(Array.from(allUris));

    // Format assertions
    const assertions: ParsedAssertion[] = this.graphs.assertion.map(triple => {
      const objValue = triple.object?.value || triple.object;
      const objIsUri = triple.object?.type === 'uri';

      return {
        subject: triple.subject,
        predicate: triple.predicate,
        object: objValue,
        subjectLabel: labels.get(triple.subject) || this.labelFetcher.parseUriLabel(triple.subject),
        predicateLabel: labels.get(triple.predicate) || this.labelFetcher.parseUriLabel(triple.predicate),
        objectLabel: objIsUri 
          ? (labels.get(objValue) || this.labelFetcher.parseUriLabel(objValue))
          : objValue
      };
    });

    // Extract metadata
    const metadata: NanopubMetadata = {};
    this.graphs.pubinfo.forEach(triple => {
      const pred = triple.predicate.split(/[#/]/).pop()?.toLowerCase() || '';
      const obj = triple.object?.value || triple.object;
      
      if (pred.includes('created')) metadata.created = obj;
      if (pred.includes('creator')) metadata.creator = obj;
      if (pred.includes('license')) metadata.license = obj;
    });

    return {
      uri: this.nanopubUri || 'unknown',
      metadata,
      assertions,
      provenance: { other: this.graphs.provenance },
      publicationInfo: { other: this.graphs.pubinfo },
      rawTriples: {
        assertion: this.graphs.assertion,
        provenance: this.graphs.provenance,
        pubinfo: this.graphs.pubinfo
      }
    };
  }
}

export async function parseNanopub(trigContent: string): Promise<ParsedNanopub> {
  const parser = new NanopubParser(trigContent);
  return await parser.parseWithLabels();
}
