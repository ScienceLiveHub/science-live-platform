import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ComboboxFieldSpecificProps } from "@/lib/formedible/types";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import React, { useState } from "react";
import { FieldWrapper } from "./base-field-wrapper";

export const ComboboxField: React.FC<ComboboxFieldSpecificProps> = ({
  fieldApi,
  label,
  description,
  placeholder,
  inputClassName,
  labelClassName,
  wrapperClassName,
  options = [],
  comboboxConfig,
}) => {
  const name = fieldApi.name;
  const value = (fieldApi.state?.value as string) || "";
  const isDisabled = fieldApi.form?.state?.isSubmitting ?? false;
  const hasErrors =
    fieldApi.state?.meta?.isTouched && fieldApi.state?.meta?.errors?.length > 0;

  const [open, setOpen] = useState(false);

  // Normalize options to consistent format
  const normalizedOptions = options.map((option) => {
    if (typeof option === "string") {
      return { value: option, label: option };
    }
    return option;
  });

  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );

  const onSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue;
    fieldApi.handleChange(newValue);
    setOpen(false);
  };

  const onBlur = () => {
    fieldApi.handleBlur();
  };

  const triggerClassName = cn(
    "w-full justify-between",
    inputClassName,
    hasErrors ? "border-destructive" : "",
  );

  const displayPlaceholder =
    placeholder || comboboxConfig?.placeholder || "Select an option";
  const searchPlaceholder =
    comboboxConfig?.searchPlaceholder || "Search options...";
  const noOptionsText = comboboxConfig?.noOptionsText || "No options found.";
  const searchable = comboboxConfig?.searchable ?? true;

  return (
    <FieldWrapper
      fieldApi={fieldApi}
      label={label}
      description={description}
      inputClassName={inputClassName}
      labelClassName={labelClassName}
      wrapperClassName={wrapperClassName}
      htmlFor={name + "-trigger"}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={triggerClassName}
            disabled={isDisabled}
            id={name + "-trigger"}
            onBlur={onBlur}
          >
            {selectedOption ? selectedOption.label : displayPlaceholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-screen max-w-5xl p-0" align="start">
          <Command>
            {searchable && (
              <CommandInput placeholder={searchPlaceholder} className="h-9" />
            )}
            <CommandList>
              <CommandEmpty>{noOptionsText}</CommandEmpty>
              <CommandGroup>
                {normalizedOptions.map((option) => (
                  <CommandItem
                    className="grid"
                    key={option.value}
                    value={option.label}
                    onSelect={() => onSelect(option.value)}
                  >
                    {option.description ? (
                      <>
                        <span className="flex font-bold">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === option.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {option.label}
                        </span>
                        <span className="ml-8 font-light wrap-break-word">
                          {option.description}
                        </span>
                      </>
                    ) : (
                      <span className="flex">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        {option.label}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  );
};
