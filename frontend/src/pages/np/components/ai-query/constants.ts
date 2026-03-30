/**
 * Constants for the AI Query Tab component.
 */

import type {
  AIConfig,
  AIProvider,
  ExamplePrompt,
  ProviderInfo,
} from "./types";

/**
 * LocalStorage key for AI configuration.
 */
export const AI_CONFIG_KEY = "science-live-ai-config";

/**
 * LocalStorage key for query history.
 */
export const QUERY_HISTORY_KEY = "science-live-query-history";

/**
 * Maximum number of history items to keep.
 */
export const MAX_HISTORY_ITEMS = 20;

/**
 * Default AI configuration.
 */
export const DEFAULT_CONFIG: AIConfig = {
  provider: "openai",
  providers: {
    openai: { model: "gpt-5.4" },
    anthropic: { model: "claude-sonnet-4-6" },
    ollama: { model: "llama3.2", baseUrl: "http://localhost:11434" },
    "openai-compatible": { model: "" },
  },
};

/**
 * System prompt for SPARQL query generation.
 * Instructs the LLM to generate valid SPARQL queries for the nanopub knowledge graph.
 */
export { default as SPARQL_GENERATION_SYSTEM_PROMPT } from "./SYSTEMPROMPT.md?raw";

/**
 * Provider metadata for UI display.
 */
export const PROVIDER_INFO: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: [],
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-...",
    apiKeyLink: "https://platform.openai.com/api-keys",
    requiresBaseUrl: false,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [],
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyLink: "https://console.anthropic.com/settings/keys",
    requiresBaseUrl: false,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: [],
    requiresApiKey: false,
    requiresBaseUrl: true,
  },
  {
    id: "openai-compatible",
    name: "OpenAI Compatible (Custom)",
    models: [], // User enters model manually since we don't know available models
    requiresApiKey: true,
    apiKeyPlaceholder: "API key...",
    requiresBaseUrl: true,
    allowCustomModel: true,
  },
];

/**
 * Example prompts for users.
 */
export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: "Find nanopubs about crabs",
    prompt: "Find nanopubs about crabs or crab species",
  },
  {
    label: "Recent nanopubs by creator",
    prompt: "Find the 10 most recent nanopubs by a specified creator",
  },
  {
    label: "Nanopubs with label containing text",
    prompt: "Find nanopubs that have a label containing 'DNA'",
  },
  {
    label: "Count nanopubs by template",
    prompt: "Count how many nanopubs exist of a specified template",
  },
];

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(provider: AIProvider): string {
  const info = PROVIDER_INFO.find((p) => p.id === provider);
  const defaultModel = info?.models.find((m) => m.isDefault);
  return defaultModel?.id ?? info?.models[0]?.id ?? "";
}

/**
 * Get provider info by provider ID.
 */
export function getProviderInfo(
  provider: AIProvider,
): ProviderInfo | undefined {
  return PROVIDER_INFO.find((p) => p.id === provider);
}
