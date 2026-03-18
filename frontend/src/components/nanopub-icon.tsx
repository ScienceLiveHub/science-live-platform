import { cn } from "@/lib/utils";

/**
 * NanopubIcon - An icon component for the Nanopub logo.
 * Supports dark/light mode by using currentColor, which inherits from text color.
 *
 * @example
 * // Default usage
 * <NanopubIcon />
 *
 * @example
 * // With custom size and color
 * <NanopubIcon className="h-6 w-6 text-primary" />
 *
 * @example
 * // In a button
 * <Button>
 *   <NanopubIcon className="h-4 w-4 mr-2" />
 *   Create Nanopub
 * </Button>
 */
export function NanopubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8 8"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M5,8H8L3,0H0M8,4.8V0H5M0,3.2V8H3" fill="currentColor" />
    </svg>
  );
}
