import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft } from "lucide-react";

export interface PaginationControlsProps {
  /** Current page number (1-based). */
  currentPage: number;
  /** Whether there are more results beyond the current page. */
  hasMore: boolean;
  /** Whether data is currently loading (disables all buttons). */
  loading?: boolean;
  /** Callback to navigate to a specific page. */
  onPageChange: (page: number) => void;
}

/**
 * Reusable pagination controls with First, Previous, and Next buttons.
 *
 * Only rendered when there's a reason to paginate (past page 1 or more
 * results available). Integrates with `usePagination` for URL-based state.
 */
export function PaginationControls({
  currentPage,
  hasMore,
  loading = false,
  onPageChange,
}: PaginationControlsProps) {
  // Only show pagination when there's a reason to (previous pages exist or more results available)
  if (currentPage <= 1 && !hasMore) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4 mr-1" />
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">Page {currentPage}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasMore || loading}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
