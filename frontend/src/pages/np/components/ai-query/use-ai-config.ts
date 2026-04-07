/**
 * Hook for managing AI configuration with localStorage persistence.
 * Settings (model, API key) are stored per-provider so switching providers
 * does not lose previously entered credentials.
 */

import { useCallback, useEffect, useState } from "react";
import { AI_CONFIG_KEY, DEFAULT_CONFIG } from "./constants";
import type { AIConfig, AIProvider, AIProviderSettings } from "./types";

/**
 * Deep-merge stored config with defaults to ensure all providers are present.
 */
function mergeWithDefaults(stored: Partial<AIConfig>): AIConfig {
  return {
    provider: stored.provider ?? DEFAULT_CONFIG.provider,
    providers: {
      openai: {
        ...DEFAULT_CONFIG.providers.openai,
        ...stored.providers?.openai,
      },
      anthropic: {
        ...DEFAULT_CONFIG.providers.anthropic,
        ...stored.providers?.anthropic,
      },
      ollama: {
        ...DEFAULT_CONFIG.providers.ollama,
        ...stored.providers?.ollama,
      },
      "openai-compatible": {
        ...DEFAULT_CONFIG.providers["openai-compatible"],
        ...stored.providers?.["openai-compatible"],
      },
    },
  };
}

/**
 * Hook for managing AI provider configuration.
 * Persists configuration to localStorage.
 */
export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CONFIG;
    }
    try {
      const stored = localStorage.getItem(AI_CONFIG_KEY);
      if (stored) {
        return mergeWithDefaults(JSON.parse(stored) as Partial<AIConfig>);
      }
    } catch (e) {
      console.error("Failed to parse AI config from localStorage:", e);
    }
    return DEFAULT_CONFIG;
  });

  // Derived: settings for the currently active provider
  const activeSettings = config.providers[config.provider];

  const isConfigured = (() => {
    if (config.provider === "ollama") return true;
    if (config.provider === "openai-compatible") {
      return !!activeSettings?.apiKey && !!activeSettings?.baseUrl;
    }
    return !!activeSettings?.apiKey;
  })();

  // Persist config to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error("Failed to save AI config to localStorage:", e);
    }
  }, [config]);

  /**
   * Switch the active provider.
   */
  const setProvider = useCallback((provider: AIProvider) => {
    setConfig((prev) => ({ ...prev, provider }));
  }, []);

  /**
   * Update settings for a specific provider (or the active one if omitted).
   */
  const updateProviderSettings = useCallback(
    (updates: Partial<AIProviderSettings>, provider?: AIProvider) => {
      setConfig((prev) => {
        const target = provider ?? prev.provider;
        return {
          ...prev,
          providers: {
            ...prev.providers,
            [target]: { ...prev.providers[target], ...updates },
          },
        };
      });
    },
    [],
  );

  /**
   * Save a full provider settings object plus optionally switch the active provider.
   * Used by ConfigDialog on save.
   */
  const saveProviderConfig = useCallback(
    (provider: AIProvider, settings: Partial<AIProviderSettings>) => {
      setConfig((prev) => ({
        ...prev,
        provider,
        providers: {
          ...prev.providers,
          [provider]: { ...prev.providers[provider], ...settings },
        },
      }));
    },
    [],
  );

  /**
   * Reset configuration to defaults.
   */
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  /**
   * Clear API key for the active provider.
   */
  const clearApiKey = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [prev.provider]: {
          ...prev.providers[prev.provider],
          apiKey: undefined,
        },
      },
    }));
  }, []);

  /**
   * Check if configuration is valid for use.
   */
  const validateConfig = useCallback((): { valid: boolean; error?: string } => {
    if (!config.provider) {
      return { valid: false, error: "No provider selected" };
    }

    const settings = config.providers[config.provider];

    if (config.provider !== "ollama" && !settings.apiKey) {
      return { valid: false, error: "API key is required" };
    }

    if (!settings.model) {
      return { valid: false, error: "No model selected" };
    }

    if (config.provider === "openai" && settings.apiKey) {
      if (!settings.apiKey.startsWith("sk-")) {
        return { valid: false, error: "Invalid OpenAI API key format" };
      }
    }

    if (config.provider === "anthropic" && settings.apiKey) {
      if (!settings.apiKey.startsWith("sk-ant-")) {
        return { valid: false, error: "Invalid Anthropic API key format" };
      }
    }

    if (config.provider === "ollama" && !settings.baseUrl) {
      return { valid: false, error: "Ollama base URL is required" };
    }

    if (config.provider === "openai-compatible") {
      if (!settings.baseUrl) {
        return {
          valid: false,
          error: "Base URL is required for OpenAI-compatible provider",
        };
      }
      if (!settings.apiKey) {
        return {
          valid: false,
          error: "API key is required for OpenAI-compatible provider",
        };
      }
    }

    return { valid: true };
  }, [config]);

  return {
    config,
    activeSettings,
    isConfigured,
    setProvider,
    updateProviderSettings,
    saveProviderConfig,
    resetConfig,
    clearApiKey,
    validateConfig,
  };
}

/**
 * Type for the return value of useAIConfig.
 */
export type AIConfigHook = ReturnType<typeof useAIConfig>;
