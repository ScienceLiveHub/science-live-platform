import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildDisabledMatchers } from "@/lib/formedible/date";
import type { DateFieldProps } from "@/lib/formedible/types";
import { cn } from "@/lib/utils";
import { format, parseISO, set } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar as CalendarIcon, Clock, Globe } from "lucide-react";
import React from "react";
import { FieldWrapper } from "./base-field-wrapper";

/**
 * Curated list of commonly used IANA timezones, grouped by region.
 * Falls back to Intl.supportedValuesOf("timeZone") if a custom list is
 * provided via dateConfig.timezones.
 */
const COMMON_TIMEZONES = Intl.supportedValuesOf("timeZone");

/**
 * Formats a timezone ID into a human-friendly label with UTC offset.
 * e.g. "Europe/London (UTC+0)" or "America/New_York (UTC-5)"
 */
function formatTimezoneLabel(tzId: string): string {
  if (tzId === "UTC") return "UTC";
  try {
    const now = new Date();
    const offsetStr = formatInTimeZone(now, tzId, "xxx"); // e.g. "+05:30"
    // Convert "+05:30" → "UTC+5:30", "-04:00" → "UTC-4"
    const sign = offsetStr[0];
    const [h, m] = offsetStr.slice(1).split(":").map(Number);
    const shortOffset =
      m === 0 ? `${sign}${h}` : `${sign}${h}:${String(m).padStart(2, "0")}`;
    // Replace underscores with spaces for display
    const cityName = tzId.split("/").pop()!.replace(/_/g, " ");
    return `${cityName} (UTC${shortOffset})`;
  } catch {
    // Fallback for invalid timezone
    return tzId;
  }
}

/** Detect the user's local IANA timezone. */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export const DateField: React.FC<DateFieldProps> = ({
  fieldApi,
  label,
  description,
  placeholder,
  inputClassName,
  labelClassName,
  wrapperClassName,
  dateConfig,
}) => {
  const isDisabled = fieldApi.form?.state?.isSubmitting ?? false;
  const hasErrors =
    fieldApi.state?.meta?.isTouched && fieldApi.state?.meta?.errors?.length > 0;

  const showTime = dateConfig?.showTime ?? false;
  const showTimezone = dateConfig?.showTimezone ?? false;

  const [isOpen, setIsOpen] = React.useState(false);

  // Subscribe to form values for dynamic date restrictions
  const [formValues, setFormValues] = React.useState(
    fieldApi.form?.state?.values || {},
  );

  React.useEffect(() => {
    if (!fieldApi.form) return;
    const subscription = fieldApi.form.store.subscribe((state) => {
      setFormValues((state as any).values);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [fieldApi.form]);

  const value = fieldApi.state?.value;
  const selectedDate = value
    ? value instanceof Date
      ? value
      : typeof value === "string"
        ? parseISO(value)
        : undefined
    : undefined;

  // Track time as "HH:mm" string for the time input when showTime is enabled
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (selectedDate) {
      return format(selectedDate, "HH:mm");
    }
    return "00:00";
  });

  // Track selected timezone
  const [timezoneValue, setTimezoneValue] = React.useState<string>(() => {
    return getUserTimezone();
  });

  // Sync timeValue when selectedDate changes from outside
  React.useEffect(() => {
    if (selectedDate) {
      const newTimeStr = format(selectedDate, "HH:mm");
      if (newTimeStr !== timeValue) {
        setTimeValue(newTimeStr);
      }
    }
  }, [selectedDate]);

  // Determine the list of timezones to show
  const timezoneOptions = React.useMemo(() => {
    const list = dateConfig?.timezones ?? COMMON_TIMEZONES;
    return list.map((tz) => ({ value: tz, label: formatTimezoneLabel(tz) }));
  }, [dateConfig?.timezones]);

  // Build disabled matchers from dateConfig with access to form values
  const disabledMatchers = React.useMemo(() => {
    // If disableDate is a function that needs form values, call it with form values
    let enhancedDateConfig = dateConfig;
    if (
      dateConfig?.disableDate &&
      typeof dateConfig.disableDate === "function"
    ) {
      // Create a wrapper that provides form values to the disable function
      const originalDisableDate = dateConfig.disableDate;
      enhancedDateConfig = {
        ...dateConfig,
        disableDate: (date: Date) => originalDisableDate(date, formValues),
      };
    }

    const matchers = buildDisabledMatchers(enhancedDateConfig);
    // If form is disabled, add a matcher that disables all dates
    if (isDisabled) {
      return true; // Disable all dates when form is disabled
    }
    return matchers.length > 0 ? matchers : undefined;
  }, [dateConfig, isDisabled, formValues]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      fieldApi.handleChange(undefined);
      return;
    }

    if (showTime) {
      // Merge selected date with current time value
      const [hours, minutes] = timeValue.split(":").map(Number);
      const merged = set(date, { hours, minutes, seconds: 0 });
      fieldApi.handleChange(merged);
      // Don't close popover when showTime — let user set time/timezone too
    } else {
      fieldApi.handleChange(date);
      fieldApi.handleBlur();
      setIsOpen(false);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    if (selectedDate && newTime) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const merged = set(selectedDate, { hours, minutes, seconds: 0 });
      fieldApi.handleChange(merged);
    }
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezoneValue(tz);
    dateConfig?.onTimezoneChange?.(tz);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // When popover closes and showTime is enabled, trigger blur for validation
    if (!open && showTime) {
      fieldApi.handleBlur();
    }
  };

  // Determine the display format for the trigger button
  const displayFormat = dateConfig?.format
    ? dateConfig.format
    : showTime
      ? "PPp"
      : "PPP";

  // Build the display string for the trigger button
  const displayText = React.useMemo(() => {
    if (!selectedDate) return null;

    if (showTimezone && showTime) {
      try {
        // Format the date in the selected timezone
        const tzFormatted = formatInTimeZone(
          selectedDate,
          timezoneValue,
          "PPp (z)",
        );
        return tzFormatted;
      } catch {
        // Fallback if timezone is invalid
        return format(selectedDate, displayFormat);
      }
    }
    return format(selectedDate, displayFormat);
  }, [selectedDate, showTimezone, showTime, timezoneValue, displayFormat]);

  const computedInputClassName = cn(
    "w-full justify-start text-left font-normal",
    !selectedDate && "text-muted-foreground",
    hasErrors ? "border-destructive" : "",
    inputClassName,
  );

  const showTimeSection = showTime || showTimezone;

  return (
    <FieldWrapper
      fieldApi={fieldApi}
      label={label}
      description={description}
      inputClassName={inputClassName}
      labelClassName={labelClassName}
      wrapperClassName={wrapperClassName}
    >
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={computedInputClassName}
            disabled={isDisabled}
            onClick={() => setIsOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {selectedDate ? (
              <span className="truncate">{displayText}</span>
            ) : (
              <span>
                {placeholder ||
                  (showTime && showTimezone
                    ? "Pick a date, time & timezone"
                    : showTime
                      ? "Pick a date and time"
                      : showTimezone
                        ? "Pick a date & timezone"
                        : "Pick a date")}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            disabled={disabledMatchers}
          />
          {showTimeSection && (
            <div className="border-t border-border p-3 space-y-2">
              {showTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={handleTimeChange}
                    disabled={isDisabled}
                    className="h-9 flex-1"
                    step={60}
                  />
                </div>
              )}
              {showTimezone && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Select
                    value={timezoneValue}
                    onValueChange={handleTimezoneChange}
                    disabled={isDisabled}
                  >
                    <SelectTrigger className="h-9 flex-1 w-full">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timezoneOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  );
};
