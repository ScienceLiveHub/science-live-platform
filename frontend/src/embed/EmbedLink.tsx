/**
 * EmbedLink
 *
 * A drop-in replacement for react-router-dom's Link that respects embed context.
 * In normal mode, behaves like a regular Link (client-side navigation).
 * In embed mode, renders an <a> tag that opens in a new tab on the main platform.
 */

import { useEmbed } from "@/embed/EmbedContext";
import { Link, type LinkProps } from "react-router-dom";

export function EmbedLink(props: LinkProps) {
  const { embedded, platformUrl } = useEmbed();

  if (embedded) {
    const href =
      typeof props.to === "string"
        ? `${platformUrl}${props.to}`
        : `${platformUrl}${props.to.pathname || ""}`;

    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={props.className}
        title={typeof props.title === "string" ? props.title : undefined}
      >
        {props.children}
      </a>
    );
  }

  return <Link {...props} />;
}
