/**
 * Service for fetching available models from AI providers.
 */

import { API_PROXY_URI } from "@/lib/uri";
import ky from "ky";
import type { AIProvider, ModelInfo } from "./types";

/**
 * Fetches available models from OpenAI API.
 * @param apiKey - OpenAI API key
 * @returns Array of ModelInfo objects
 */
export async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await ky
      .get("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      })
      .json<{ data: { id: string }[] }>();

    // Filter to chat models
    const chatModels = response.data
      .filter((model) => isChatModel(model.id))
      .map((model) => ({
        id: model.id,
        name: formatModelName(model.id),
        isDefault: model.id === "gpt-5.4-mini",
      }));

    return chatModels;
  } catch (error) {
    console.error("Failed to fetch OpenAI models:", error);
    throw new Error(
      "Failed to fetch OpenAI models. Please check your API key.",
      { cause: error },
    );
  }
}

/**
 * Fetches available models from Anthropic API via the Science Live proxy.
 * Uses the /v1/models endpoint to dynamically fetch available models.
 * The proxy is required because Anthropic's API doesn't support CORS for browser requests.
 * @param apiKey - Anthropic API key
 * @returns Array of ModelInfo objects
 */
export async function fetchAnthropicModels(
  apiKey: string,
): Promise<ModelInfo[]> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("API key is required");
    }

    // Use the Science Live proxy to avoid CORS issues
    const targetUrl = "https://api.anthropic.com/v1/models";

    const res = await ky.post(API_PROXY_URI, {
      json: {
        url: targetUrl,
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
      credentials: "include", // send session cookie so the proxy auth check passes
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw Error(`Proxy request failed (${res.status}): ${text}`);
    }

    const response = (await res.json()) as {
      data: {
        id: string;
        display_name: string;
        type: string;
        created_at?: string;
      }[];
      has_more?: boolean;
      first_id?: string;
      last_id?: string;
    };

    if (!response.data || response.data.length === 0) {
      // Fallback to curated list if API returns empty
      return DEFAULT_ANTHROPIC_MODELS;
    }

    // Map the response to ModelInfo format
    // Models are returned with most recent first, so we use the first as default
    return response.data.map((model, index) => ({
      id: model.id,
      name: model.display_name || formatModelName(model.id),
      isDefault: index === 0,
    }));
  } catch (error) {
    console.error("Failed to fetch Anthropic models:", error);
    // Fallback to curated list on error
    console.warn("Falling back to default Anthropic models list");
    return DEFAULT_ANTHROPIC_MODELS;
  }
}

const DEFAULT_ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    isDefault: true,
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
  },
];

/**
 * Fetches available models from Ollama instance.
 * @param baseUrl - Ollama base URL (default: http://localhost:11434)
 * @returns Array of ModelInfo objects
 */
export async function fetchOllamaModels(
  baseUrl: string = "http://localhost:11434",
): Promise<ModelInfo[]> {
  try {
    const response = await ky
      .get(`${baseUrl}/api/tags`, {
        timeout: 10000,
      })
      .json<{ models: { name: string; modified_at?: string }[] }>();

    if (!response.models || response.models.length === 0) {
      return [];
    }

    return response.models.map((model, index) => ({
      id: model.name,
      name: formatModelName(model.name),
      isDefault: index === 0,
    }));
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error);
    throw new Error(
      "Failed to connect to Ollama. Please check that Ollama is running at " +
        baseUrl,
      { cause: error },
    );
  }
}

/**
 * Fetches available models from an OpenAI-compatible API endpoint.
 * @param baseUrl - Base URL for the OpenAI-compatible API
 * @param apiKey - API key for authentication
 * @returns Array of ModelInfo objects
 */
export async function fetchOpenAICompatibleModels(
  baseUrl: string,
  apiKey: string,
): Promise<ModelInfo[]> {
  try {
    const response = await ky
      .get(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      })
      .json<{ data: { id: string }[] }>();

    if (!response.data || response.data.length === 0) {
      return [];
    }

    return response.data.map((model, index) => ({
      id: model.id,
      name: model.id,
      isDefault: index === 0,
    }));
  } catch (error) {
    console.error("Failed to fetch OpenAI-compatible models:", error);
    // Don't throw - allow user to enter model manually
    return [];
  }
}

/**
 * Fetches available models from OpenRouter API.
 * OpenRouter provides access to multiple AI providers through a single API.
 * @param apiKey - OpenRouter API key
 * @returns Array of ModelInfo objects
 */
export async function fetchOpenRouterModels(
  apiKey: string,
): Promise<ModelInfo[]> {
  try {
    const response = await ky
      .get("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      })
      .json<{
        data: {
          id: string;
          name?: string;
          description?: string;
          context_length?: number;
          architecture?: {
            input_modalities: string[];
            output_modalities: string[];
          };
          pricing?: {
            prompt?: string;
            completion?: string;
          };
        }[];
      }>();

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Filter to chat models and sort by popularity (using id alphabetically as a proxy)
    return response.data
      .filter(
        (model) =>
          model.architecture?.input_modalities?.includes("text") &&
          model.architecture?.output_modalities?.includes("text"),
      )
      .map((model, index) => ({
        id: model.id,
        name: model.name || formatModelName(model.id),
        isDefault: model.id === "anthropic/claude-3.5-sonnet" || index === 0,
      }));
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    throw new Error(
      "Failed to fetch OpenRouter models. Please check your API key.",
      { cause: error },
    );
  }
}

/**
 * Fetches models from the appropriate provider.
 */
export async function fetchModels(
  provider: AIProvider,
  options: { apiKey?: string; baseUrl?: string },
): Promise<ModelInfo[]> {
  switch (provider) {
    case "openai":
      if (!options.apiKey) {
        throw new Error("API key is required for OpenAI");
      }
      return fetchOpenAIModels(options.apiKey);
    case "anthropic":
      if (!options.apiKey) {
        throw new Error("API key is required for Anthropic");
      }
      return fetchAnthropicModels(options.apiKey);
    case "ollama":
      return fetchOllamaModels(options.baseUrl);
    case "openai-compatible":
      if (!options.apiKey || !options.baseUrl) {
        // Return empty array - user will enter model manually
        return [];
      }
      return fetchOpenAICompatibleModels(options.baseUrl, options.apiKey);
    case "openrouter":
      if (!options.apiKey) {
        throw new Error("API key is required for OpenRouter");
      }
      return fetchOpenRouterModels(options.apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a model ID is a chat model (not embedding, tts, etc.)
 * In particular, OpenAI benefits from this filter.
 */
function isChatModel(modelId: string): boolean {
  const chatPatterns = [/^gpt-oss/, /^gpt-5/, /^gpt-4/, /^chatgpt/];

  const excludePatterns = [
    /-realtime/,
    /-audio/,
    /-tts/,
    /-whisper/,
    /-embedding/,
    /-moderation/,
    /-dall-e/,
  ];

  return (
    chatPatterns.some((p) => p.test(modelId)) &&
    !excludePatterns.some((p) => p.test(modelId))
  );
}

/**
 * Format model ID into a display name.
 */
function formatModelName(modelId: string): string {
  // Handle common model naming patterns
  const nameMap: Record<string, string> = {
    // TODO: we could map model ids to names here, but avoid it unless required, due to maintenance overhead
    "gpt-5.4": "GPT-5.4",
  };

  if (nameMap[modelId]) {
    return nameMap[modelId];
  }

  // Default formatting: capitalize words
  return modelId
    .split(/[-_:]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
