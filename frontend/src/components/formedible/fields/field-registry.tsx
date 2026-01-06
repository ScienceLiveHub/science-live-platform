"use client";
import type { BaseFieldProps } from "@/lib/formedible/types";
import React from "react";

// Import all field components
import { ArrayField } from "./array-field";
import { AutocompleteField } from "./autocomplete-field";
import { CheckboxField } from "./checkbox-field";
import { ColorPickerField } from "./color-picker-field";
import { ComboboxField } from "./combobox-field";
import { DateField } from "./date-field";
import { DurationPickerField } from "./duration-picker-field";
import { FileUploadField } from "./file-upload-field";
import { LocationPickerField } from "./location-picker-field";
import { MaskedInputField } from "./masked-input-field";
import { MultiSelectField } from "./multi-select-field";
import { MultiComboboxField } from "./multicombobox-field";
import { NumberField } from "./number-field";
import { ObjectField } from "./object-field";
import { PhoneField } from "./phone-field";
import { RadioField } from "./radio-field";
import { RatingField } from "./rating-field";
import { SelectField } from "./select-field";
import { SliderField } from "./slider-field";
import { SwitchField } from "./switch-field";
import { TextField } from "./text-field";
import { TextareaField } from "./textarea-field";

// Type-safe field component registry with flexible props
export interface FieldComponentProps extends BaseFieldProps {
  [key: string]: unknown;
}

export type FieldComponent = React.ComponentType<any>;

export const fieldComponents: Record<string, FieldComponent> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  select: SelectField,
  multiselect: MultiSelectField,
  combobox: ComboboxField,
  multicombobox: MultiComboboxField,
  checkbox: CheckboxField,
  switch: SwitchField,
  radio: RadioField,
  slider: SliderField,
  date: DateField,
  rating: RatingField,
  phone: PhoneField,
  color: ColorPickerField,
  file: FileUploadField,
  array: ArrayField,
  autocomplete: AutocompleteField,
  duration: DurationPickerField,
  location: LocationPickerField,
  masked: MaskedInputField,
  object: ObjectField,
};

// Helper function to get field component with type safety
export const getFieldComponent = (type: string): FieldComponent | null => {
  return fieldComponents[type] || null;
};

// Helper function to create properly typed field props
export const createFieldProps = (
  baseProps: BaseFieldProps,
  additionalProps: Record<string, unknown> = {},
): FieldComponentProps => {
  return {
    ...baseProps,
    ...additionalProps,
  };
};
