import React from "react";

import type { FieldConfig } from "@/lib/formedible/types";

/**
 * Intended as a `globalWrapper` for Formedible forms.
 *
 * Prepends the text "optional" above optional form fields.
 */
export default function ShowOptionalWrapper({
  children,
  field,
}: {
  children: React.ReactNode;
  field: FieldConfig;
}) {
  const isRequired = field.required === true;

  return (
    <>
      {!isRequired && (
        <span className="m-0 block text-xs text-muted-foreground/50">
          optional
        </span>
      )}
      {children}
    </>
  );
}
