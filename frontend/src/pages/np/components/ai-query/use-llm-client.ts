/**
 * Hook for LLM client interactions using TanStack AI.
 */

import { API_PROXY_URI } from "@/lib/uri";
import { chat } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { createOpenRouterText } from "@tanstack/ai-openrouter";
import ky from "ky";
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
   * Optionally takes an existing query to edit based on the prompt.
   */
  const generateSparqlQuery = useCallback(
    async (prompt: string, existingQuery?: string): Promise<string | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const userPrompt = existingQuery
          ? `The user has the following SPARQL query:

\`\`\`sparql
${existingQuery}
\`\`\`

They want to make this change: ${prompt}

Please modify the query according to their request. Only output the modified SPARQL query, nothing else.`
          : `Generate a SPARQL query for: ${prompt}`;

        let response: string;

        const openaiCompatSettings = config.providers["openai-compatible"];

        if (config.provider === "ollama") {
          // Call Ollama directly so we can pass `think: false` at the top level
          // of the ChatRequest. The TanStack AI Ollama adapter spreads modelOptions
          // into Ollama's nested `options` object, which does not reach the
          // top-level `think` field that controls reasoning mode.
          response = await callOllamaDirectly(
            config.providers.ollama.baseUrl || "http://localhost:11434",
            config.providers.ollama.model,
            SPARQL_GENERATION_SYSTEM_PROMPT,
            userPrompt,
          );
        } else if (
          config.provider === "openai-compatible" &&
          openaiCompatSettings.useProxy
        ) {
          // Route through the Science Live API proxy to avoid CORS restrictions.
          response = await callOpenAICompatViaProxy(
            openaiCompatSettings.baseUrl ?? "",
            openaiCompatSettings.model,
            openaiCompatSettings.apiKey ?? "",
            SPARQL_GENERATION_SYSTEM_PROMPT,
            userPrompt,
          );
        } else {
          const adapter = getAdapterForConfig(config);
          response = await chat({
            adapter,
            systemPrompts: [SPARQL_GENERATION_SYSTEM_PROMPT],
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.3,
            stream: false,
          });
        }

        return extractSparqlQuery(response);
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
 * Extract a clean SPARQL query from an LLM response.
 *
 * Local models (e.g. Ollama/Qwen) often return verbose output including:
 * - <think>...</think> reasoning blocks
 * - Markdown code fences (```sparql ... ```)
 * - Preamble text like "Here is the query:" before the actual SPARQL
 * - Postamble explanations after the query
 *
 * Strategy:
 * 1. Strip <think>...</think> blocks entirely.
 * 2. If a ```sparql ... ``` or ``` ... ``` fence is present, extract its content.
 * 3. Otherwise, find the first line that looks like a SPARQL keyword (prefix/select/ask/construct/describe)
 *    and return everything from that line onward, trimming trailing prose.
 */
export function extractSparqlQuery(raw: string): string {
  // 1. Remove <think>...</think> blocks (Qwen 3 "thinking" mode)
  const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Extract from markdown code fence if present
  const fenceMatch = text.match(/```(?:sparql)?\s*\n?([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // 3. Find the first SPARQL keyword line and take from there
  const lines = text.split("\n");
  const sparqlStartIndex = lines.findIndex((line) =>
    /^\s*(prefix|select|ask|construct|describe)\b/i.test(line),
  );

  if (sparqlStartIndex !== -1) {
    // Take from the first SPARQL keyword to the end, then trim trailing prose.
    // Trailing prose typically starts after the closing brace of the query.
    const sparqlLines = lines.slice(sparqlStartIndex);

    // Find the last line that is part of the query (non-empty and not pure prose).
    // We consider the query ended when we see a blank line followed by a line
    // that doesn't look like SPARQL (no indentation, no SPARQL keywords, no braces).
    let endIndex = sparqlLines.length;
    for (let i = 1; i < sparqlLines.length; i++) {
      const prev = sparqlLines[i - 1].trim();
      const curr = sparqlLines[i].trim();
      if (
        prev === "" &&
        curr !== "" &&
        !/^[{}()?$#<"'0-9]/.test(curr) &&
        !/^\s*(prefix|select|ask|construct|describe|where|filter|optional|union|graph|limit|offset|order|group|having|values|bind|minus|service|from|named)\b/i.test(
          curr,
        )
      ) {
        endIndex = i;
        break;
      }
    }

    return sparqlLines.slice(0, endIndex).join("\n").trim();
  }

  // 4. Fallback: return the cleaned text as-is
  return text;
}

/**
 * Call Ollama's /api/chat endpoint directly.
 *
 * We bypass the TanStack AI Ollama adapter here because it spreads `modelOptions`
 * into Ollama's nested `options` object, which does not reach the top-level
 * `think` field. Passing `think: false` at the top level of the request body
 * disables the reasoning/thinking mode on models that support it (e.g. Qwen 3),
 * preventing large `<think>...</think>` blocks from being generated at all.
 */
async function callOllamaDirectly(
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;

  const res = await ky.post(url, {
    json: {
      model,
      think: false, // Disable reasoning/thinking mode (Qwen 3, DeepSeek-R1, etc.)
      stream: false,
      options: {
        temperature: 0.3,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    timeout: 60_000,
    retry: 0,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Unexpected Ollama response format");
  }
  return content;
}

/**
 * Call an OpenAI-compatible `/chat/completions` endpoint via the Science Live
 * API proxy. Used when the provider blocks direct browser requests (CORS).
 *
 * The proxy accepts a standard `POST /proxy` request with the target URL,
 * method, headers, and body. It forwards the request server-side and streams
 * the response back — no data is stored or logged.
 */
async function callOpenAICompatViaProxy(
  baseUrl: string,
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const targetUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const upstreamBody = JSON.stringify({
    model,
    stream: false,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const res = await ky.post(API_PROXY_URI, {
    json: {
      url: targetUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamBody,
    },
    credentials: "include",
    timeout: 60_000,
    retry: 0,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Proxy request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`Provider error: ${data.error.message}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Unexpected response format from provider via proxy");
  }
  return content;
}

/**
 * Get the TanStack AI adapter instance for the current configuration.
 * Reads model/apiKey/baseUrl from the per-provider settings map.
 * Note: Ollama is handled separately via callOllamaDirectly.
 */
function getAdapterForConfig(config: AIConfig) {
  const settings = config.providers[config.provider];
  switch (config.provider) {
    case "openai":
      return createOpenaiChat(
        settings.model as Parameters<typeof createOpenaiChat>[0],
        settings.apiKey ?? "",
        { dangerouslyAllowBrowser: true },
      );
    case "anthropic":
      return createAnthropicChat(
        settings.model as Parameters<typeof createAnthropicChat>[0],
        settings.apiKey ?? "",
        { dangerouslyAllowBrowser: true },
      );
    case "openai-compatible":
      return createOpenaiChat(
        settings.model as Parameters<typeof createOpenaiChat>[0],
        settings.apiKey ?? "",
        {
          dangerouslyAllowBrowser: true,
          baseURL: settings.baseUrl,
        },
      );
    case "openrouter":
      return createOpenRouterText(
        settings.model as Parameters<typeof createOpenRouterText>[0],
        settings.apiKey ?? "",
      );
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Type for the return value of useLLMClient.
 */
export type LLMClientHook = ReturnType<typeof useLLMClient>;
