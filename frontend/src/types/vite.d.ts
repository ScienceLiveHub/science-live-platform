/// <reference types="vite/client" />

declare module "*.md" {
  import type { ReactNode } from "react";

  export const frontmatter: Record<string, unknown>;
  const MarkdownComponent: () => ReactNode;
  export default MarkdownComponent;
}
