/**
 * Reusable copy-to-clipboard button component.
 */

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional tooltip title */
  title?: string;
  /** Button variant */
  variant?:
    | "ghost"
    | "outline"
    | "default"
    | "destructive"
    | "secondary"
    | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Duration in ms to show the check mark (default: 2000) */
  showCopiedDuration?: number;
  /** Optional additional class names */
  className?: string;
}

export function CopyButton({
  text,
  disabled = false,
  title = "Copy to clipboard",
  variant = "ghost",
  size = "sm",
  showCopiedDuration = 2000,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), showCopiedDuration);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [text, showCopiedDuration]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled || !text}
      title={title}
      className={className}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="ml-1 sr-only">Copy</span>
    </Button>
  );
}
