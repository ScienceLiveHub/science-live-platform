/**
 * Configuration dialog for AI provider settings.
 * Settings (model, API key) are stored and restored per-provider.
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AI_CONFIG_KEY, PROVIDER_INFO, getDefaultModel } from "./constants";
import { ModelCombobox } from "./ModelCombobox";
import type { AIConfig, AIProvider, AIProviderSettings } from "./types";

interface ConfigDialogProps {
  config: AIConfig;
  /** Called with the provider and its updated settings when the user saves. */
  onSave: (provider: AIProvider, settings: Partial<AIProviderSettings>) => void;
  /** Called when all configuration is deleted. */
  onDeleteAll?: () => void;
  trigger?: React.ReactNode;
}

export function ConfigDialog({
  config,
  onSave,
  onDeleteAll,
  trigger,
}: ConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active provider selection in the dialog (may differ from config.provider until saved)
  const [provider, setProvider] = useState<AIProvider>(config.provider);

  // Per-provider local state — initialised from the stored per-provider settings
  const [apiKey, setApiKey] = useState(
    config.providers[config.provider].apiKey ?? "",
  );
  const [model, setModel] = useState(config.providers[config.provider].model);
  const [baseUrl, setBaseUrl] = useState(
    config.providers[config.provider].baseUrl ?? "http://localhost:11434",
  );
  const [useProxy, setUseProxy] = useState(
    config.providers[config.provider].useProxy ?? false,
  );
  const [showApiKey, setShowApiKey] = useState(false);

  const currentProviderInfo = PROVIDER_INFO.find((p) => p.id === provider);

  // When the dialog opens, sync local state from the current config
  useEffect(() => {
    if (open) {
      setProvider(config.provider);
      const settings = config.providers[config.provider];
      setApiKey(settings.apiKey ?? "");
      setModel(settings.model);
      setBaseUrl(settings.baseUrl ?? "http://localhost:11434");
      setUseProxy(settings.useProxy ?? false);
      setShowApiKey(false);
    }
  }, [open, config]);

  // When the provider selection changes, restore that provider's saved settings
  const handleProviderChange = (value: AIProvider) => {
    setProvider(value);
    const saved = config.providers[value];
    setModel(saved.model || getDefaultModel(value));
    setApiKey(saved.apiKey ?? "");
    setBaseUrl(saved.baseUrl ?? "http://localhost:11434");
    setUseProxy(saved.useProxy ?? false);
  };

  const handleSave = () => {
    const settings: Partial<AIProviderSettings> = { model };

    if (currentProviderInfo?.requiresApiKey) {
      settings.apiKey = apiKey;
    }
    if (provider === "ollama" || provider === "openai-compatible") {
      settings.baseUrl = baseUrl;
    }
    if (provider === "openai-compatible") {
      settings.useProxy = useProxy;
    }

    onSave(provider, settings);
    setOpen(false);
  };

  const isSaveDisabled = () => {
    if (!provider || !model) return true;
    if (currentProviderInfo?.requiresApiKey && !apiKey.trim()) return true;
    if (provider === "ollama" && !baseUrl.trim()) return true;
    if (provider === "openai-compatible" && (!baseUrl.trim() || !apiKey.trim()))
      return true;
    return false;
  };

  const handleDeleteAll = () => {
    try {
      localStorage.removeItem(AI_CONFIG_KEY);
      onDeleteAll?.();
      setOpen(false);
    } catch (e) {
      console.error("Failed to delete AI config from localStorage:", e);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
            <span className="sr-only">AI Settings</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Provider Configuration</DialogTitle>
          <DialogDescription>
            Configure your AI provider for use of AI features in Science Live
            Platform. Each API key is stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Provider Selection */}
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_INFO.map((info) => (
                  <SelectItem key={info.id} value={info.id}>
                    {info.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key (for OpenAI and Anthropic) */}
          {currentProviderInfo?.requiresApiKey && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey">API Key</Label>
                {currentProviderInfo.apiKeyLink && (
                  <a
                    href={currentProviderInfo.apiKeyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Get API Key
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder={currentProviderInfo.apiKeyPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showApiKey ? "Hide" : "Show"} API Key
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Base URL (for Ollama and OpenAI-compatible) */}
          {(provider === "ollama" || provider === "openai-compatible") && (
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">
                {provider === "openai-compatible"
                  ? "API Endpoint URL"
                  : "Base URL"}
              </Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder={
                  provider === "openai-compatible"
                    ? "https://api.example.com/v1"
                    : "http://localhost:11434"
                }
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {provider === "openai-compatible"
                  ? "The base URL for the OpenAI-compatible API endpoint (e.g., LM Studio, vLLM, local-ai)"
                  : "The URL where Ollama is running. Default is http://localhost:11434"}
              </p>
            </div>
          )}

          {/* Use API Proxy (openai-compatible only) */}
          {provider === "openai-compatible" && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="useProxy"
                checked={useProxy}
                onCheckedChange={(checked) => setUseProxy(checked === true)}
                className="mt-0.5"
              />
              <div className="grid gap-1">
                <Label htmlFor="useProxy" className="cursor-pointer">
                  Route requests via Science Live proxy
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable this if your provider blocks direct browser requests
                  (CORS errors). Requests will be forwarded through the Science
                  Live API (sign-in required) — no data is stored or logged.
                </p>
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <ModelCombobox
              provider={provider}
              value={model}
              onValueChange={setModel}
              apiKey={apiKey}
              baseUrl={baseUrl}
              disabled={
                (currentProviderInfo?.requiresApiKey && !apiKey.trim()) ||
                (provider === "ollama" && !baseUrl.trim()) ||
                (provider === "openai-compatible" &&
                  (!baseUrl.trim() || !apiKey.trim()))
              }
              allowCustomModel={currentProviderInfo?.allowCustomModel}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete all AI configuration"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete all configuration</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaveDisabled()}>
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>Delete All AI Configuration?</DialogTitle>
            <DialogDescription>
              This will remove all AI provider settings including API keys and
              model selections stored in your browser. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
