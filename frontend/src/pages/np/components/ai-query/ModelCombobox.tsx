/**
 * Searchable combobox for selecting AI models.
 * Fetches available models dynamically from the selected provider.
 */

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { PROVIDER_INFO } from "./constants";
import { fetchModels } from "./model-service";
import type { AIProvider, ModelInfo } from "./types";

interface ModelComboboxProps {
  /** Currently selected provider */
  provider: AIProvider;
  /** Currently selected model ID */
  value: string;
  /** Callback when model selection changes */
  onValueChange: (value: string) => void;
  /** API key for the provider (required for OpenAI and Anthropic) */
  apiKey?: string;
  /** Base URL for Ollama or OpenAI-compatible */
  baseUrl?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Whether to allow custom model input (for OpenAI-compatible providers) */
  allowCustomModel?: boolean;
  /** Called when fetching the model list fails (or succeeds with null) */
  onFetchError?: (error: string | null) => void;
}

export function ModelCombobox({
  provider,
  value,
  onValueChange,
  apiKey,
  baseUrl,
  className,
  disabled,
  allowCustomModel,
  onFetchError,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const currentProviderInfo = PROVIDER_INFO.find((p) => p.id === provider);

  // Check if we have valid credentials
  const hasValidCredentials = (() => {
    if (provider === "ollama") {
      return !!baseUrl;
    }
    if (provider === "openai-compatible") {
      return !!baseUrl && !!apiKey && apiKey.trim() !== "";
    }
    return !!apiKey && apiKey.trim() !== "";
  })();

  // Fetch models when provider or credentials change
  useEffect(() => {
    // Reset state when provider changes
    setModels([]);
    setError(null);
    onFetchError?.(null);

    // If no valid credentials, use fallback models from PROVIDER_INFO
    if (!hasValidCredentials) {
      const fallbackModels = currentProviderInfo?.models ?? [];
      setModels(fallbackModels);
      return;
    }

    const loadModels = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedModels = await fetchModels(provider, {
          apiKey,
          baseUrl,
        });
        setModels(fetchedModels);
        onFetchError?.(null);

        // If current value is not in the new list, select the default
        if (fetchedModels.length > 0) {
          const currentValueExists = fetchedModels.some((m) => m.id === value);
          if (!currentValueExists) {
            const defaultModel =
              fetchedModels.find((m) => m.isDefault) ?? fetchedModels[0];
            onValueChange(defaultModel.id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch models. Please check your configuration.";
        setError(errorMessage);
        onFetchError?.(errorMessage);
        // Fall back to static models on error
        const fallbackModels = currentProviderInfo?.models ?? [];
        setModels(fallbackModels);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [provider, apiKey, baseUrl, hasValidCredentials, currentProviderInfo]);

  // Filter models based on search query
  const filteredModels =
    searchQuery.trim() === ""
      ? models
      : models.filter(
          (model) =>
            model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

  const selectedModel = models.find((m) => m.id === value);

  const handleRefresh = async () => {
    if (!hasValidCredentials) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedModels = await fetchModels(provider, {
        apiKey,
        baseUrl,
      });
      setModels(fetchedModels);
      onFetchError?.(null);
    } catch (err) {
      console.error("Failed to refresh models:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh models.";
      setError(errorMessage);
      onFetchError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (modelId: string) => {
    onValueChange(modelId === value ? "" : modelId);
    setOpen(false);
  };

  const isCustomModelEnabled = !!allowCustomModel;

  const credentialsPlaceholder =
    provider === "ollama"
      ? "base URL"
      : provider === "openai-compatible"
        ? "API endpoint URL and API key"
        : "API key";

  const triggerPlaceholder = isCustomModelEnabled
    ? hasValidCredentials
      ? "Select or enter a model name"
      : "Enter API endpoint URL and API key"
    : hasValidCredentials
      ? "Select a model"
      : `Enter ${credentialsPlaceholder} to load models`;

  const triggerLabel = isCustomModelEnabled
    ? "Select or enter model"
    : "Select model";

  const inputPlaceholder = isCustomModelEnabled
    ? "Enter model name or search..."
    : "Search models...";

  const emptyMessage = isLoading
    ? "Loading..."
    : hasValidCredentials
      ? isCustomModelEnabled
        ? "Type a model name to use it."
        : "No models found."
      : isCustomModelEnabled
        ? "Enter API endpoint URL and API key to load models."
        : "Enter credentials to load models.";

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={triggerLabel}
            className="flex-1 justify-between"
            disabled={disabled}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading models...
              </span>
            ) : isCustomModelEnabled ? (
              value ? (
                value
              ) : (
                <span className="text-muted-foreground">
                  {triggerPlaceholder}
                </span>
              )
            ) : selectedModel ? (
              selectedModel.name
            ) : (
              <span className="text-muted-foreground">
                {triggerPlaceholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={inputPlaceholder}
              className="h-9"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {error && (
                <div className="px-2 py-1.5 text-xs text-destructive">
                  {error}
                </div>
              )}
              {isCustomModelEnabled && (
                <>
                  {/* Allow selecting the search query as the model name */}
                  {searchQuery.trim() &&
                    !filteredModels.some(
                      (m) => m.id === searchQuery.trim(),
                    ) && (
                      <CommandGroup>
                        <CommandItem
                          value={searchQuery.trim()}
                          onSelect={() => handleSelect(searchQuery.trim())}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === searchQuery.trim()
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span>Use "{searchQuery.trim()}"</span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                </>
              )}
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {filteredModels.length > 0 && (
                <CommandGroup>
                  {filteredModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => handleSelect(model.id)}
                    >
                      <Check
                        className={cn(
                          "focus:text-accent-foreground",
                          "mr-2 h-4 w-4",
                          value === model.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold">
                          {isCustomModelEnabled && model.id === model.name
                            ? model.name.split("/").pop()
                            : model.name}
                        </span>
                        <span className="text-xs font-light">{model.id}</span>
                      </div>
                      {model.isDefault && (
                        <span className="ml-auto text-xs italic">Default</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {hasValidCredentials && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading || disabled}
          title="Refresh models"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
