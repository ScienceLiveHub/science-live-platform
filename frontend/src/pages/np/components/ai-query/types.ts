/**
 * Type definitions for the AI Query Tab component.
 */

/**
 * Supported AI providers for SPARQL query generation.
 */
export type AIProvider = "openai" | "anthropic" | "ollama";

/**
 * Configuration for AI provider connection.
 * Stored in localStorage for persistence.
 */
export interface AIConfig {
  /** The AI provider to use */
  provider: AIProvider;
  /** API key for the provider (not needed for Ollama) */
  apiKey?: string;
  /** Model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022") */
  model: string;
  /** Base URL for Ollama (default: http://localhost:11434) */
  baseUrl?: string;
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
