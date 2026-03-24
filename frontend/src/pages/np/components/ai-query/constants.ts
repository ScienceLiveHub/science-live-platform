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
 * Default AI configuration.
 */
export const DEFAULT_CONFIG: AIConfig = {
  provider: "openai",
  model: "gpt-4o",
  baseUrl: "http://localhost:11434",
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
    models: [
      { id: "gpt-4o", name: "GPT-4o", isDefault: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-...",
    apiKeyLink: "https://platform.openai.com/api-keys",
    requiresBaseUrl: false,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        isDefault: true,
      },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyLink: "https://console.anthropic.com/settings/keys",
    requiresBaseUrl: false,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: [
      { id: "llama3.2", name: "Llama 3.2", isDefault: true },
      { id: "llama3.1", name: "Llama 3.1" },
      { id: "mistral", name: "Mistral" },
      { id: "codellama", name: "Code Llama" },
      { id: "qwen2.5", name: "Qwen 2.5" },
    ],
    requiresApiKey: false,
    requiresBaseUrl: true,
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
    prompt: "Find the 10 most recent nanopubs by a specific creator",
  },
  {
    label: "Nanopubs with label containing text",
    prompt: "Find nanopubs that have a label containing 'DNA'",
  },
  {
    label: "Count nanopubs by type",
    prompt: "Count how many nanopubs exist for each RDF type",
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
