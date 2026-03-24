/**
 * Hook for managing SPARQL query history with localStorage persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { MAX_HISTORY_ITEMS, QUERY_HISTORY_KEY } from "./constants";
import type { QueryHistoryItem } from "./types";

/**
 * Hook for managing query history.
 * Persists history to localStorage and maintains a maximum of MAX_HISTORY_ITEMS.
 */
export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistoryItem[]>(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = localStorage.getItem(QUERY_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueryHistoryItem[];
        // Validate the structure
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse query history from localStorage:", e);
    }
    return [];
  });

  // Persist history to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save query history to localStorage:", e);
    }
  }, [history]);

  /**
   * Add a new item to the history.
   * If the same query already exists, it will be moved to the top with updated timestamp.
   */
  const addToHistory = useCallback(
    (query: string, resultCount: number, prompt?: string) => {
      if (!query.trim()) return;

      const newItem: QueryHistoryItem = {
        id: crypto.randomUUID(),
        query: query.trim(),
        prompt,
        resultCount,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => {
        // Remove any existing entry with the same query
        const filtered = prev.filter(
          (item) => item.query.trim() !== query.trim(),
        );
        // Add new item at the beginning and limit to MAX_HISTORY_ITEMS
        return [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      });
    },
    [],
  );

  /**
   * Clear all history.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  /**
   * Remove a specific item from history.
   */
  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
