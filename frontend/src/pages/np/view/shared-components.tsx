/**
 * Shared Components for custom Nanopub Views
 *
 */

import { cn } from "@/lib/utils";
import { ExternalLink, Link2, MessageCircle, Quote } from "lucide-react";
import { ReactNode } from "react";

// =============================================================================
// SECTION TITLE
// =============================================================================

interface ItemTitleProps {
  /** The title text to display */
  title: ReactNode;
  /** Optional icon to display before the title */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A small label/title for sections within a nanopub view card.
 */
export function ItemTitle({ title, icon, className }: ItemTitleProps) {
  return (
    <p
      className={cn(
        "text-sm font-medium text-muted-foreground mb-1",
        className,
      )}
    >
      {icon}
      {title}
    </p>
  );
}

// =============================================================================
// EXTERNAL LINK
// =============================================================================

interface ExternalUriLinkProps {
  /** The URL to link to */
  uri: string;
  /** The label to display (defaults to URI if not provided) */
  label?: string;
  /** Whether to show the external link icon */
  showExternalIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A styled external link that opens in a new tab.
 */
export function ExternalUriLink({
  uri,
  label,
  showExternalIcon = true,
  className,
}: ExternalUriLinkProps) {
  return (
    <a
      href={uri}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all",
        className,
      )}
    >
      {label || uri}
      {showExternalIcon && <ExternalLink className="h-3 w-3 shrink-0" />}
    </a>
  );
}

// =============================================================================
// PAPER REFERENCE LINK
// =============================================================================

interface PaperLinkProps {
  /** The paper URL/DOI */
  url: string;
  /** The display label for the paper */
  label: string;
  /** Title text for the section (default: "Paper") */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A paper reference with icon and external link.
 * Used across multiple nanopub view components.
 */
export function PaperLink({
  url,
  label,
  title = "Paper",
  className,
}: PaperLinkProps) {
  return (
    <div className={className}>
      <ItemTitle title={title} />
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <ExternalUriLink uri={url} label={label} />
      </div>
    </div>
  );
}

// =============================================================================
// QUOTATION BLOCK
// =============================================================================

interface QuotationBlockProps {
  /** The quoted text to display */
  text: string;
  /** Optional end of quotation (for start/end quoting) */
  textEnd?: string;
  /** Title text for the section (default: "Quotation") */
  title?: string;
  /** Border/accent color theme */
  colorClass?: string;
  /** Background color theme */
  bgClass?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A styled blockquote for displaying quoted text from papers.
 */
export function QuotationBlock({
  text,
  textEnd,
  title = "Quotation",
  colorClass = "border-rose-300",
  bgClass = "bg-rose-50 dark:bg-rose-950/20",
  className,
}: QuotationBlockProps) {
  return (
    <div className={className}>
      <ItemTitle title={title} className="mb-2" />
      <blockquote
        className={cn(
          "rounded-md border-l-4 p-4 text-base leading-relaxed",
          colorClass,
          bgClass,
        )}
      >
        <Quote
          className={cn(
            "h-4 w-4 mb-1 inline-block mr-1",
            colorClass.replace("border-", "text-"),
          )}
        />
        <span className="italic">{text}</span>
        {textEnd && (
          <>
            <span className="mx-2 text-muted-foreground">…</span>
            <span className="italic">{textEnd}</span>
          </>
        )}
      </blockquote>
    </div>
  );
}

// =============================================================================
// COMMENT BLOCK
// =============================================================================

interface CommentBlockProps {
  /** The comment text to display */
  text: string;
  /** Title text for the section (default: "Comment") */
  title?: string;
  /** Whether to show the message icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A styled block for displaying user comments or interpretations.
 */
export function CommentBlock({
  text,
  title = "Comment",
  showIcon = true,
  className,
}: CommentBlockProps) {
  return (
    <div className={className}>
      <ItemTitle
        title={title}
        icon={
          showIcon ? (
            <MessageCircle className="h-4 w-4 inline-block mr-1" />
          ) : null
        }
        className="mb-2"
      />
      <div className="rounded-md border bg-muted/30 p-4 text-base leading-relaxed">
        {text}
      </div>
    </div>
  );
}

// =============================================================================
// RELATED NANOPUB LINK
// =============================================================================

interface RelatedNanopubLinkProps {
  /** The nanopub URI */
  uri: string;
  /** The display label */
  label: string;
  /** The URL to link to (defaults to uri if not provided) */
  href?: string;
  /** Title text for the section (default: "Related Nanopublication") */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A link to a related nanopublication.
 */
export function RelatedNanopubLink({
  uri,
  label,
  href,
  title = "Related Nanopublication",
  className,
}: RelatedNanopubLinkProps) {
  return (
    <div className={className}>
      <ItemTitle title={title} />
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <a
          href={href || uri}
          rel="noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
        >
          {label}
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// DATASET LINK
// =============================================================================

interface DatasetLinkProps {
  /** The dataset URL */
  url: string;
  /** The display label */
  label: string;
  /** Title text for the section (default: "Supporting Dataset") */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A link to a supporting dataset.
 */
export function DatasetLink({
  url,
  label,
  title = "Supporting Dataset",
  className,
}: DatasetLinkProps) {
  return (
    <div className={className}>
      <ItemTitle title={title} />
      <div className="flex items-center gap-2">
        <ExternalUriLink uri={url} label={label} className="text-sm" />
      </div>
    </div>
  );
}

// =============================================================================
// SCIENTIFIC CLAIM BLOCK
// =============================================================================

interface ScientificClaimBlockProps {
  /** The claim text to display */
  text: string;
  /** Title text for the section (default: "Scientific Claim") */
  title?: string;
  /** Border/accent color theme */
  colorClass?: string;
  /** Background color theme */
  bgClass?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A styled block for displaying a scientific claim (AIDA sentence).
 */
export function ScientificClaimBlock({
  text,
  title = "Scientific Claim",
  colorClass = "border-emerald-400",
  bgClass = "bg-emerald-50 dark:bg-emerald-950/20",
  className,
}: ScientificClaimBlockProps) {
  return (
    <div className={className}>
      <ItemTitle title={title} className="mb-2" />
      <div className={cn("rounded-md border-l-4 p-4", colorClass, bgClass)}>
        <p className="text-lg font-medium leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
