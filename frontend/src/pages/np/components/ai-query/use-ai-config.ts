/**
 * Hook for managing AI configuration with localStorage persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { AI_CONFIG_KEY, DEFAULT_CONFIG, getDefaultModel } from "./constants";
import type { AIConfig } from "./types";

/**
 * Hook for managing AI provider configuration.
 * Persists configuration to localStorage.
 */
export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return DEFAULT_CONFIG;
    }

    try {
      const stored = localStorage.getItem(AI_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AIConfig>;
        // Merge with defaults to ensure all fields are present
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        };
      }
    } catch (e) {
      console.error("Failed to parse AI config from localStorage:", e);
    }
    return DEFAULT_CONFIG;
  });

  const [isConfigured, setIsConfigured] = useState(() => {
    // Check if we have a valid configuration
    if (config.provider === "ollama") {
      return true; // Ollama doesn't require API key
    }
    return !!config.apiKey;
  });

  // Persist config to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save AI config to localStorage:", e);
    }

    // Update isConfigured state
    if (config.provider === "ollama") {
      setIsConfigured(true);
    } else {
      setIsConfigured(!!config.apiKey);
    }
  }, [config]);

  /**
   * Update configuration with partial values.
   */
  const updateConfig = useCallback((updates: Partial<AIConfig>) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      // If provider changed, update to default model for that provider
      if (updates.provider && updates.provider !== prev.provider) {
        newConfig.model = getDefaultModel(updates.provider);
        // Clear API key when switching away from a provider
        if (updates.provider === "ollama") {
          newConfig.apiKey = undefined;
        }
      }

      return newConfig;
    });
  }, []);

  /**
   * Reset configuration to defaults.
   */
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  /**
   * Clear API key from configuration.
   */
  const clearApiKey = useCallback(() => {
    setConfig((prev) => ({ ...prev, apiKey: undefined }));
  }, []);

  /**
   * Check if configuration is valid for use.
   */
  const validateConfig = useCallback((): { valid: boolean; error?: string } => {
    if (!config.provider) {
      return { valid: false, error: "No provider selected" };
    }

    if (config.provider !== "ollama" && !config.apiKey) {
      return { valid: false, error: "API key is required" };
    }

    if (!config.model) {
      return { valid: false, error: "No model selected" };
    }

    // Validate API key format
    if (config.provider === "openai" && config.apiKey) {
      if (!config.apiKey.startsWith("sk-")) {
        return { valid: false, error: "Invalid OpenAI API key format" };
      }
    }

    if (config.provider === "anthropic" && config.apiKey) {
      if (!config.apiKey.startsWith("sk-ant-")) {
        return { valid: false, error: "Invalid Anthropic API key format" };
      }
    }

    if (config.provider === "ollama" && !config.baseUrl) {
      return { valid: false, error: "Ollama base URL is required" };
    }

    return { valid: true };
  }, [config]);

  return {
    config,
    isConfigured,
    updateConfig,
    resetConfig,
    clearApiKey,
    validateConfig,
  };
}

/**
 * Type for the return value of useAIConfig.
 */
export type AIConfigHook = ReturnType<typeof useAIConfig>;
