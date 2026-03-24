/**
 * Configuration dialog for AI provider settings.
 */

import { Button } from "@/components/ui/button";
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
import { Eye, EyeOff, Settings } from "lucide-react";
import { useState } from "react";
import { PROVIDER_INFO, getDefaultModel } from "./constants";
import type { AIConfig, AIProvider } from "./types";

interface ConfigDialogProps {
  config: AIConfig;
  onSave: (config: Partial<AIConfig>) => void;
  trigger?: React.ReactNode;
}

export function ConfigDialog({ config, onSave, trigger }: ConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey ?? "");
  const [model, setModel] = useState(config.model);
  const [baseUrl, setBaseUrl] = useState(
    config.baseUrl ?? "http://localhost:11434",
  );
  const [showApiKey, setShowApiKey] = useState(false);

  const currentProviderInfo = PROVIDER_INFO.find((p) => p.id === provider);
  const models = currentProviderInfo?.models ?? [];

  const handleProviderChange = (value: AIProvider) => {
    setProvider(value);
    setModel(getDefaultModel(value));
    // Clear API key when switching to Ollama
    if (value === "ollama") {
      setApiKey("");
    }
  };

  const handleSave = () => {
    const newConfig: Partial<AIConfig> = {
      provider,
      model,
    };

    // Only include API key if required
    if (currentProviderInfo?.requiresApiKey) {
      newConfig.apiKey = apiKey;
    }

    // Only include base URL for Ollama
    if (provider === "ollama") {
      newConfig.baseUrl = baseUrl;
    }

    onSave(newConfig);
    setOpen(false);
  };

  const isSaveDisabled = () => {
    if (!provider || !model) return true;
    if (currentProviderInfo?.requiresApiKey && !apiKey.trim()) return true;
    if (provider === "ollama" && !baseUrl.trim()) return true;
    return false;
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
            Configure your AI provider for SPARQL query generation. Your API key
            is stored locally in your browser.
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

          {/* Model Selection */}
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
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

          {/* Base URL (for Ollama) */}
          {provider === "ollama" && (
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The URL where Ollama is running. Default is
                http://localhost:11434
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaveDisabled()}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
