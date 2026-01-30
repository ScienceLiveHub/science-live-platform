"use client";
import { ComponentType } from "react";
import {
  TEMPLATE_COMPONENTS,
  type NanopubTemplateDefComponentProps,
} from "./component-registry";
import {
  TEMPLATE_METADATA,
  type NanopubTemplateMetadata,
} from "./registry-metadata";

/**
 * Definition for a pre-defined popular template
 * Note: NanopubTemplateDefComponentProps is imported from component-registry
 */
export interface NanopubTemplateDef extends NanopubTemplateMetadata {
  component?: ComponentType<NanopubTemplateDefComponentProps>;
}

/**
 * POPULAR TEMPLATES metadata
 * These appear in the main template selector
 *
 * Note: Component is only available in frontend context.
 * Other workspaces should import TEMPLATE_METADATA directly to avoid
 * bundling React components they don't need.
 */
export const POPULAR_TEMPLATES: Record<string, NanopubTemplateDef> =
  Object.entries(TEMPLATE_METADATA).reduce(
    (acc, [key, meta]) => {
      acc[key] = {
        ...meta,
        component: TEMPLATE_COMPONENTS[key], // Component mapping only in frontend
      };
      return acc;
    },
    {} as Record<string, NanopubTemplateDef>,
  );
