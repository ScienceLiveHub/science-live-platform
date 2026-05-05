/**
 * Utility for opening external URLs that works in both browser and Zotero contexts.
 *
 * In a normal browser, `<a target="_blank">` works fine. But inside a Zotero
 * XUL dialog iframe (`type="content"`), link clicks are silently swallowed.
 *
 * Components that need to open external URLs should accept an optional
 * `onOpenExternalUrl` callback prop. In Zotero context, this callback is wired
 * to `Zotero.launchURL()` via the bridge scripts. In normal browser context,
 * the fallback `window.open()` is used.
 */

/** Callback type for opening external URLs. */
export type OpenExternalUrlFn = (url: string) => void;

/**
 * Default implementation: opens a URL in a new browser tab.
 * Used as fallback when no Zotero-specific callback is provided.
 */
export const defaultOpenExternalUrl: OpenExternalUrlFn = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

/**
 * Create a click handler for `<a>` elements that opens the link via the
 * provided callback (or falls back to `window.open`).
 *
 * Usage:
 * ```tsx
 * <a href={url} onClick={makeExternalLinkHandler(onOpenExternalUrl)} ...>
 * ```
 */
export function makeExternalLinkHandler(
  onOpenExternalUrl?: OpenExternalUrlFn,
): (e: React.MouseEvent<HTMLAnchorElement>) => void {
  const opener = onOpenExternalUrl ?? defaultOpenExternalUrl;
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url = e.currentTarget.href;
    if (url) {
      opener(url);
    }
  };
}
