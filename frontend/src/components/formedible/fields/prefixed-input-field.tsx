"use client";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { BaseFieldProps } from "@/lib/formedible/types";
import { cn } from "@/lib/utils";
import React from "react";
import { FieldWrapper } from "./base-field-wrapper";

export interface PrefixedInputConfig {
  /** The full prefix URI/value shown in the addon chip. */
  prefix: string;
  /** Short label shown in the addon chip (e.g. "nanopub"). */
  prefixLabel: string;
}

export interface PrefixedInputFieldProps extends BaseFieldProps {
  prefixedInputConfig?: PrefixedInputConfig;
}

/**
 * A text input with a visual prefix chip rendered before the field.
 *
 * The form only stores the **suffix** (user-typed portion); the template
 * engine is responsible for prepending `prefix` at nanopub-generation time.
 */
export const PrefixedInputField: React.FC<PrefixedInputFieldProps> = ({
  fieldApi,
  label,
  description,
  placeholder,
  inputClassName,
  labelClassName,
  wrapperClassName,
  prefixedInputConfig,
}) => {
  const name = fieldApi.name;
  const value = (fieldApi.state?.value as string) ?? "";
  const isDisabled = fieldApi.form?.state?.isSubmitting ?? false;
  const hasErrors =
    fieldApi.state?.meta?.isTouched && fieldApi.state?.meta?.errors?.length > 0;

  const prefixLabel = prefixedInputConfig?.prefixLabel ?? "";
  const prefix = prefixedInputConfig?.prefix ?? "";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    fieldApi.handleChange(e.target.value);
  };

  const onBlur = () => {
    fieldApi.handleBlur();
  };

  return (
    <FieldWrapper
      fieldApi={fieldApi}
      label={label}
      description={description}
      labelClassName={labelClassName}
      wrapperClassName={wrapperClassName}
    >
      <InputGroup title={prefix}>
        <InputGroupAddon className="font-mono text-xs bg-muted/60">
          <span>{prefixLabel}</span>
        </InputGroupAddon>
        <InputGroupInput
          id={name}
          name={name}
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(inputClassName, hasErrors ? "border-destructive" : "")}
          disabled={isDisabled}
        />
      </InputGroup>
    </FieldWrapper>
  );
};
