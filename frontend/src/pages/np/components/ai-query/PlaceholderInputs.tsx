/**
 * Component to display input fields for SPARQL query placeholders.
 *
 * Parses the query for placeholders (denoted with ?_... syntax) and
 * provides appropriate input fields with validation.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle, CircleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  insertPlaceholderValues,
  parsePlaceholders,
  validatePlaceholderValue,
} from "./parse-placeholders";

interface PlaceholderInputsProps {
  /** The SPARQL query to parse for placeholders */
  query: string;
  /** Callback when the query with inserted values changes */
  onQueryChange?: (query: string) => void;
  /** Callback when all required placeholders are filled */
  onValidChange?: (isValid: boolean) => void;
  /** Whether the inputs should be disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Component that displays input fields for SPARQL query placeholders.
 */
export function PlaceholderInputs({
  query,
  onQueryChange,
  onValidChange,
  disabled = false,
  className,
}: PlaceholderInputsProps) {
  // Parse placeholders from the query
  const placeholders = useMemo(() => parsePlaceholders(query), [query]);

  // State for placeholder values
  const [values, setValues] = useState<Record<string, string>>({});

  // State for touched fields (to show validation errors only after interaction)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Calculate validation state for each field
  const validationState = useMemo(() => {
    const state: Record<string, { isValid: boolean; error?: string }> = {};
    for (const placeholder of placeholders) {
      const value = values[placeholder.name] ?? "";
      const error = validatePlaceholderValue(value, placeholder.isUri);
      state[placeholder.name] = {
        isValid: !error,
        error: touched[placeholder.name] ? error : undefined,
      };
    }
    return state;
  }, [placeholders, values, touched]);

  // Calculate overall validity
  const isValid = useMemo(() => {
    return placeholders.length > 0
      ? placeholders.every(
          (p) => validationState[p.name]?.isValid || !values[p.name],
        ) && placeholders.every((p) => (values[p.name] ?? "").trim() !== "")
      : true; // No placeholders = always valid
  }, [placeholders, validationState, values]);

  // Notify parent of validity changes
  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  // Generate and notify of query with inserted values
  useEffect(() => {
    if (placeholders.length === 0) {
      onQueryChange?.(query);
      return;
    }

    // Check if all placeholders have values
    const allFilled = placeholders.every(
      (p) => (values[p.name] ?? "").trim() !== "",
    );

    if (allFilled) {
      const queryWithValues = insertPlaceholderValues(
        query,
        values,
        placeholders,
      );
      onQueryChange?.(queryWithValues);
    }
  }, [query, values, placeholders, onQueryChange]);

  // Handle input change
  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handle blur (mark as touched)
  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  // Handle clear all values
  const handleClear = useCallback(() => {
    setValues({});
    setTouched({});
  }, []);

  // Don't render if no placeholders
  if (placeholders.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Query Parameters</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
          className="text-xs text-muted-foreground"
        >
          Clear all
        </Button>
      </div>

      <div className="grid gap-4">
        {placeholders.map((placeholder) => {
          const state = validationState[placeholder.name];
          const value = values[placeholder.name] ?? "";

          return (
            <div key={placeholder.name} className="flex flex-col gap-1.5">
              <Label
                htmlFor={placeholder.name}
                className="flex items-center gap-2 text-sm"
              >
                {placeholder.label}
                {placeholder.isUri && (
                  <span className="text-xs text-muted-foreground">(URI)</span>
                )}
                {state.isValid && value.trim() && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                )}
              </Label>
              <div className="relative">
                <Input
                  id={placeholder.name}
                  type="text"
                  value={value}
                  onChange={(e) =>
                    handleChange(placeholder.name, e.target.value)
                  }
                  onBlur={() => handleBlur(placeholder.name)}
                  placeholder={
                    placeholder.isUri ? "https://..." : "Enter a value"
                  }
                  disabled={disabled}
                  className={cn(
                    state.error &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                {state.error && (
                  <CircleAlert className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              {state.error && (
                <p className="text-xs text-destructive">{state.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isValid ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            All parameters provided
          </>
        ) : (
          <>
            <CircleAlert className="h-3.5 w-3.5 text-amber-500" />
            Fill in all required parameters
          </>
        )}
      </div>
    </div>
  );
}
