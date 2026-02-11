"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDynamicText } from "@/lib/formedible/template-interpolation";
import type { BaseFieldProps, ObjectFieldProps } from "@/lib/formedible/types";
import React from "react";
import { FieldWrapper } from "./base-field-wrapper";
import { NestedFieldRenderer } from "./shared-field-renderer";

export const ObjectField: React.FC<ObjectFieldProps> = ({
  fieldApi,
  objectConfig,
  disabled,
  form,
  ...wrapperProps
}) => {
  const [isExpanded, setIsExpanded] = React.useState(
    objectConfig?.defaultExpanded !== false,
  );

  // Subscribe to form values for dynamic text resolution
  const [subscribedValues, setSubscribedValues] = React.useState(
    fieldApi.form?.state?.values || {},
  );

  React.useEffect(() => {
    if (!fieldApi.form) return;
    const unsubscribe = fieldApi.form.store.subscribe((state) => {
      setSubscribedValues((state as any).values);
    });
    return unsubscribe;
  }, [fieldApi.form]);

  // Track per-sub-field touched state
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Create a properly typed mockFieldApi that includes the form property
  const createMockFieldApi = (fieldName: string, fieldValue: unknown) => {
    const fullFieldName = `${fieldApi.name}.${fieldName}`;

    // First, check for sub-field errors passed down from array-field
    // via the _subFieldErrors property on the parent's meta
    const parentSubFieldErrors = (fieldApi.state?.meta as any)
      ?._subFieldErrors as Record<string, string[]> | undefined;
    let subFieldErrors: unknown[] = [];

    if (parentSubFieldErrors && parentSubFieldErrors[fieldName]) {
      subFieldErrors = parentSubFieldErrors[fieldName];
    }

    // Also check the form's fieldMeta for this specific sub-field
    if (subFieldErrors.length === 0) {
      const fieldMeta = fieldApi.form?.state?.fieldMeta;
      if (fieldMeta) {
        const subMeta = fieldMeta[fullFieldName as keyof typeof fieldMeta] as
          | { errors?: unknown[] }
          | undefined;
        if (subMeta?.errors && subMeta.errors.length > 0) {
          subFieldErrors = subMeta.errors;
        }
      }
    }

    // Sub-field is touched if:
    // - the user interacted with it directly (blur), OR
    // - the parent is touched (e.g., from array field or form validation), OR
    // - the form has been submitted
    const parentTouched = fieldApi.state?.meta?.isTouched ?? false;
    const formSubmitted = (fieldApi.form?.state as any)?.submissionAttempts > 0;
    const subFieldTouched =
      touchedFields.has(fieldName) || parentTouched || formSubmitted;

    return {
      name: fullFieldName,
      form: fieldApi.form,
      state: {
        ...fieldApi.state,
        value: fieldValue,
        meta: {
          ...fieldApi.state.meta,
          errors: subFieldErrors,
          isTouched: subFieldTouched,
        },
      },
      handleChange: (value: unknown) => {
        const currentValue = fieldApi.state?.value || {};
        fieldApi.handleChange({
          ...currentValue,
          [fieldName]: value,
        });
      },
      handleBlur: () => {
        setTouchedFields((prev) => {
          const next = new Set(prev);
          next.add(fieldName);
          return next;
        });
        fieldApi.handleBlur();
      },
    };
  };

  const renderField = (subFieldConfig: any) => {
    const fieldValue = fieldApi.state?.value?.[subFieldConfig.name] || "";
    const mockFieldApi = createMockFieldApi(
      subFieldConfig.name,
      fieldValue,
    ) as unknown as BaseFieldProps["fieldApi"];

    return (
      <div key={subFieldConfig.name}>
        <NestedFieldRenderer
          fieldConfig={subFieldConfig}
          fieldApi={mockFieldApi}
          form={form}
          currentValues={
            (fieldApi.state?.value || {}) as Record<string, unknown>
          }
        />
      </div>
    );
  };

  const getLayoutClasses = () => {
    const layout = objectConfig?.layout || "vertical";
    const columns = objectConfig?.columns || 2;

    switch (layout) {
      case "horizontal":
        return "flex flex-wrap gap-4";
      case "grid":
        return `grid grid-cols-1 md:grid-cols-${columns} gap-4`;
      default:
        return "space-y-4";
    }
  };

  const content = (
    <FieldWrapper fieldApi={fieldApi} {...wrapperProps}>
      <div className="space-y-4">
        {/* Object title and description */}
        {(objectConfig?.title || objectConfig?.description) && (
          <div className="space-y-1">
            {objectConfig?.title && (
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {resolveDynamicText(objectConfig.title, subscribedValues)}
                </h4>
                {objectConfig?.collapsible && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded
                      ? resolveDynamicText(
                          objectConfig?.collapseLabel || "Collapse",
                          subscribedValues,
                        )
                      : resolveDynamicText(
                          objectConfig?.expandLabel || "Expand",
                          subscribedValues,
                        )}
                  </button>
                )}
              </div>
            )}
            {objectConfig?.description && (
              <p className="text-xs text-muted-foreground">
                {resolveDynamicText(objectConfig.description, subscribedValues)}
              </p>
            )}
          </div>
        )}

        {/* Fields */}
        {(!objectConfig?.collapsible || isExpanded) && (
          <>
            {objectConfig?.title && <div className="border-t my-4" />}
            <div className={getLayoutClasses()}>
              {objectConfig?.fields?.map(renderField)}
            </div>
          </>
        )}

        {/* Show field errors */}
        {fieldApi.state?.meta?.errors &&
          fieldApi.state?.meta?.errors.length > 0 && (
            <div className="text-sm text-destructive">
              {fieldApi.state?.meta?.errors.join(", ")}
            </div>
          )}
      </div>
    </FieldWrapper>
  );

  // Wrap in card if specified
  if (objectConfig?.showCard) {
    return (
      <Card className="w-full">
        {(objectConfig?.title || objectConfig?.description) && (
          <CardHeader className="pb-3">
            {objectConfig?.title && (
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {resolveDynamicText(objectConfig.title, subscribedValues)}
                </CardTitle>
                {objectConfig?.collapsible && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded
                      ? resolveDynamicText(
                          objectConfig?.collapseLabel || "Collapse",
                          subscribedValues,
                        )
                      : resolveDynamicText(
                          objectConfig?.expandLabel || "Expand",
                          subscribedValues,
                        )}
                  </button>
                )}
              </div>
            )}
            {objectConfig?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {resolveDynamicText(objectConfig.description, subscribedValues)}
              </p>
            )}
          </CardHeader>
        )}
        <CardContent className="pt-0">
          {(!objectConfig?.collapsible || isExpanded) && (
            <>
              <div className={getLayoutClasses()}>
                {objectConfig?.fields?.map(renderField)}
              </div>
            </>
          )}

          {/* Show field errors */}
          {fieldApi.state?.meta?.errors &&
            fieldApi.state?.meta?.errors.length > 0 && (
              <div className="text-sm text-destructive mt-4">
                {fieldApi.state?.meta?.errors.join(", ")}
              </div>
            )}
        </CardContent>
      </Card>
    );
  }

  return content;
};
