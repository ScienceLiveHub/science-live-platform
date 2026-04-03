/**
 * Type definitions for the AI Query Tab component.
 */

/**
 * Supported AI providers for SPARQL query generation.
 */
export type AIProvider =
  | "openai"
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "openai-compatible";

/**
 * Per-provider settings stored independently so switching providers
 * does not lose previously entered credentials or model selections.
 */
export interface AIProviderSettings {
  /** Model identifier for this provider */
  model: string;
  /** API key (not needed for Ollama) */
  apiKey?: string;
  /** Base URL (Ollama / openai-compatible, default: http://localhost:11434) */
  baseUrl?: string;
  /**
   * Route requests through the Science Live API proxy endpoint instead of
   * calling the provider directly from the browser. Useful for openai-compatible
   * providers that block browser requests due to CORS restrictions.
   */
  useProxy?: boolean;
}

/**
 * Top-level AI configuration stored in localStorage.
 * Credentials and model selections are kept per-provider.
 */
export interface AIConfig {
  /** The currently active provider */
  provider: AIProvider;
  /** Per-provider settings map */
  providers: Record<AIProvider, AIProviderSettings>;
}

/**
 * Query workflow step states.
 */
export type QueryStep =
  | "idle" // Initial state, waiting for prompt
  | "generating" // LLM is generating SPARQL query
  | "editing" // User can edit the generated query
  | "executing" // SPARQL query is being executed
  | "results" // Results are displayed
  | "error"; // Error occurred

/**
 * State for the query generation and execution workflow.
 */
export interface QueryState {
  /** Current step in the workflow */
  step: QueryStep;
  /** User's natural language prompt */
  prompt: string;
  /** LLM-generated SPARQL query */
  generatedQuery: string | null;
  /** User-modified SPARQL query */
  editedQuery: string | null;
  /** SPARQL execution results */
  results: Record<string, string>[] | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Provider metadata for UI display.
 */
export interface ProviderInfo {
  /** Provider identifier */
  id: AIProvider;
  /** Display name */
  name: string;
  /** Available models for this provider */
  models: ModelInfo[];
  /** Whether API key is required */
  requiresApiKey: boolean;
  /** Placeholder for API key input */
  apiKeyPlaceholder?: string;
  /** Link to get API key */
  apiKeyLink?: string;
  /** Whether base URL configuration is needed (Ollama) */
  requiresBaseUrl: boolean;
  /** Whether to allow custom model input (for OpenAI-compatible providers) */
  allowCustomModel?: boolean;
}

/**
 * Model information for a specific AI model.
 */
export interface ModelInfo {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Whether this is the default model for the provider */
  isDefault?: boolean;
}

/**
 * Example prompts for users.
 */
export interface ExamplePrompt {
  /** Short label for the example */
  label: string;
  /** The prompt text */
  prompt: string;
}

/**
 * A single result row from a SPARQL query.
 */
export type QueryResultItem = Record<string, string>;

/**
 * An item in the SPARQL query history.
 */
export interface QueryHistoryItem {
  /** Unique identifier for the history item */
  id: string;
  /** The SPARQL query text */
  query: string;
  /** The natural language prompt that generated the query (if any) */
  prompt?: string;
  /** Number of results returned by the query or -1 if error */
  resultCount: number;
  /** ISO timestamp when the query was executed */
  timestamp: string;
}
