/**
 * Main AI Query Tab component that orchestrates the query generation workflow.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Settings, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { ConfigDialog } from "./ConfigDialog";
import { QueryHistory } from "./QueryHistory";
import { QueryResults } from "./QueryResults";
import { SparqlEditor } from "./SparqlEditor";
import { EXAMPLE_PROMPTS } from "./constants";
import type { QueryHistoryItem, QueryResultItem, QueryStep } from "./types";
import { useAIConfig } from "./use-ai-config";
import { useLLMClient } from "./use-llm-client";
import { useQueryHistory } from "./use-query-history";

export function AiQueryTab() {
  // Configuration state
  const { config, isConfigured, updateConfig } = useAIConfig();

  // LLM client
  const {
    generateSparqlQuery,
    isGenerating,
    error: llmError,
    clearError,
  } = useLLMClient(config);

  // Query history
  const { history, addToHistory, clearHistory, removeFromHistory } =
    useQueryHistory();

  // Query state
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
  const [generatedQuery, setGeneratedQuery] = useState<string | null>(null);
  const [editedQuery, setEditedQuery] = useState<string | null>(null);
  const [step, setStep] = useState<QueryStep>("idle");

  /**
   * Handle generating a SPARQL query from the prompt.
   * If there's an existing query, the prompt is treated as an edit request.
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !isConfigured) return;

    clearError();
    setStep("generating");

    try {
      // Pass existing query if we're editing
      const query = await generateSparqlQuery(
        prompt.trim(),
        editedQuery ?? undefined,
      );
      if (query) {
        setGeneratedQuery(query);
        setEditedQuery(query);
        // Store the original prompt for context
        if (!originalPrompt) {
          setOriginalPrompt(prompt.trim());
        }
        setStep("editing");
      } else {
        setStep("error");
      }
    } catch {
      setStep("error");
    }
  }, [
    prompt,
    isConfigured,
    clearError,
    generateSparqlQuery,
    editedQuery,
    originalPrompt,
  ]);

  /**
   * Handle executing the query.
   */
  const handleExecute = () => {
    if (!editedQuery) return;
    setStep("executing");
  };

  /**
   * Handle query execution results.
   */
  const handleResults = useCallback(
    (results: QueryResultItem[] | null) => {
      setStep("results");
      const count = results?.length ?? -1;

      // Add to history when query completes successfully
      if (editedQuery) {
        addToHistory(editedQuery, count, originalPrompt ?? undefined);
      }
    },
    [editedQuery, originalPrompt, addToHistory],
  );

  /**
   * Handle query execution error.
   */
  const handleError = useCallback(() => {
    setStep("error");
  }, []);

  /**
   * Handle selecting a query from history.
   */
  const handleHistorySelect = useCallback((item: QueryHistoryItem) => {
    // Load the query from history
    setEditedQuery(item.query);
    setGeneratedQuery(item.query);
    setPrompt(item.prompt ?? "");
    setOriginalPrompt(item.prompt ?? null);
    // Execute immediately
    setStep("executing");
  }, []);

  /**
   * Reset to start a new query.
   */
  const handleReset = useCallback(() => {
    setPrompt("");
    setOriginalPrompt(null);
    setGeneratedQuery(null);
    setEditedQuery(null);
    setStep("idle");
    clearError();
  }, [clearError]);

  /**
   * Handle example prompt click.
   */
  const handleExampleClick = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
  }, []);

  // Show config dialog if not configured
  const showConfigPrompt = !isConfigured;

  // Determine if we're in editing mode (query already generated)
  const hasExistingQuery = step !== "idle" && step !== "generating";

  return (
    <div className="flex flex-col gap-6">
      {/* Header with settings button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI-Powered SPARQL Query</h3>
          <p className="text-sm text-muted-foreground">
            {hasExistingQuery
              ? "If required, make any additional updates to the query, then press Execute Query."
              : "Describe what you want to find in natural language"}
          </p>
        </div>
        <ConfigDialog
          config={config}
          onSave={updateConfig}
          trigger={
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          }
        />
      </div>

      {/* Configuration prompt if not configured */}
      {showConfigPrompt && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <Settings className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <div className="font-medium text-amber-600">
                Configuration Required
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Please configure your AI provider to generate SPARQL queries.
                {config.provider === "ollama"
                  ? " Make sure Ollama is running locally."
                  : " An API key is required."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt input area - always visible */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              hasExistingQuery
                ? "e.g., Add a filter for year > 2020"
                : "e.g., Find nanopubs about crabs or crab species"
            }
            className="min-h-20 resize-none"
            disabled={isGenerating || showConfigPrompt}
          />
        </div>

        {/* Generate/Update button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            variant={hasExistingQuery ? "outline" : "default"}
            disabled={!prompt.trim() || isGenerating || showConfigPrompt}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {hasExistingQuery ? "Updating..." : "Generating..."}
              </>
            ) : hasExistingQuery ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Update Query
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Query
              </>
            )}
          </Button>

          {/* Reset button when there's an existing query */}
          {hasExistingQuery && (
            <Button variant="outline" onClick={handleReset}>
              New Query
            </Button>
          )}
        </div>

        {/* Example prompts - only show for initial query */}
        {!hasExistingQuery && (
          <div className="flex flex-col gap-2 my-10">
            <span className="text-sm text-muted-foreground">Examples:</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example.prompt)}
                  disabled={isGenerating || showConfigPrompt}
                  className="text-xs"
                >
                  {example.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* LLM Error */}
        {llmError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <div className="text-sm text-destructive wrap-break-word">
              {llmError}
            </div>
          </div>
        )}

        {/* Query History */}
        {!hasExistingQuery && (
          <QueryHistory
            history={history}
            onSelect={handleHistorySelect}
            onClear={clearHistory}
            onRemove={removeFromHistory}
          />
        )}
      </div>

      {/* SPARQL Editor */}
      {(step === "editing" ||
        step === "executing" ||
        step === "results" ||
        step === "error") && (
        <div className="flex flex-col gap-4">
          <SparqlEditor
            value={editedQuery ?? ""}
            onChange={setEditedQuery}
            originalQuery={generatedQuery ?? undefined}
            loading={isGenerating}
            readOnly={step === "executing"}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {step === "editing" && (
              <Button onClick={handleExecute} disabled={!editedQuery}>
                <Play className="h-4 w-4 mr-2" />
                Execute Query
              </Button>
            )}
          </div>

          {/* Query Results */}
          {(step === "executing" || step === "results" || step === "error") && (
            <QueryResults
              query={editedQuery}
              autoExecute={step === "executing"}
              onResults={handleResults}
              onError={handleError}
            />
          )}
        </div>
      )}
    </div>
  );
}
