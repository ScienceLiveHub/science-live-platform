/**
 * Hook for LLM client interactions using Vercel AI SDK.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider";
import { useCallback, useState } from "react";
import { SPARQL_GENERATION_SYSTEM_PROMPT } from "./constants";
import type { AIConfig } from "./types";

/**
 * Hook for generating SPARQL queries using LLM.
 */
export function useLLMClient(config: AIConfig) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a SPARQL query from a natural language prompt.
   */
  const generateSparqlQuery = useCallback(
    async (prompt: string): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const model = getModelForConfig(config);

        const result = await generateText({
          model,
          system: SPARQL_GENERATION_SYSTEM_PROMPT,
          prompt: `Generate a SPARQL query for: ${prompt}`,
          temperature: 0.3, // Lower temperature for more deterministic output
        });

        // Clean up the response - remove markdown code blocks if present
        let query = result.text.trim();

        // Remove markdown code blocks if the LLM included them
        if (query.startsWith("```sparql")) {
          query = query.slice(9);
        } else if (query.startsWith("```")) {
          query = query.slice(3);
        }
        if (query.endsWith("```")) {
          query = query.slice(0, -3);
        }

        return query.trim();
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Query generation failed";
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [config],
  );

  /**
   * Clear any error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateSparqlQuery,
    isGenerating,
    error,
    clearError,
  };
}

/**
 * Get the AI SDK model instance for the current configuration.
 * Uses type assertion to handle compatibility between AI SDK versions.
 * The ollama-ai-provider returns LanguageModelV1 which is compatible at runtime
 * with the AI SDK's generateText function.
 */
function getModelForConfig(config: AIConfig) {
  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.apiKey,
      });
      return openai(config.model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
      });
      return anthropic(config.model);
    }
    case "ollama": {
      const ollama = createOllama({
        baseURL: config.baseUrl || "http://localhost:11434",
      });
      // Cast to unknown first to handle type incompatibility between
      // LanguageModelV1 (from ollama-ai-provider) and LanguageModel (from ai sdk)
      // They are compatible at runtime
      return ollama(config.model) as unknown as ReturnType<
        ReturnType<typeof createOpenAI>
      >;
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Type for the return value of useLLMClient.
 */
export type LLMClientHook = ReturnType<typeof useLLMClient>;
