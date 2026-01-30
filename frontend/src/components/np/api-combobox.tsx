/*
 * A pair of shadcn searchable combobox components that obtain values
 * dynamically from multiple API endpoints.
 *
 * Notes:
 *  - Both a multi-combobox and a single-combobox version are provided
 *  - It's possible for the parent component (e.g. Formedible) to wrap and
 *    control the component by specifying `value` (input default value) +
 *    an `onValueChange` callback to retrieve the selection.
 */

import { useEffect, useId, useState } from "react";

import { CheckIcon, ChevronsUpDownIcon, Loader2, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import ky, { KyResponse } from "ky";

export type ResultItem = {
  uri: string;
  label: string;
  description?: string;
};

export type SearchEndpoint = {
  name: string;
  label: string;
  // The url for the endpoint.  The query string will be appended on the end e.g. "https://api.example.com/search="
  url: string;
  // Should transform the API response to an array of ResultItem
  parser: (res: KyResponse) => Promise<ResultItem[]>;
};

// Fetch search results and process returned data using custom parser
const searchEndpoint = async (
  query: string,
  endpoint: SearchEndpoint,
): Promise<ResultItem[]> => {
  // Append query to url
  const url = `${endpoint.url}${encodeURIComponent(query)}`;

  try {
    const res = await ky(url);
    if (!res.ok) throw new Error("Network response was not ok");
    return await endpoint.parser(res);
  } catch (e) {
    console.error("Fetch error:", e);
    return [];
  }
};

const searchAllEndpoints = async (
  query: string,
  endpoints: SearchEndpoint[],
): Promise<ResultItem[]> => {
  // TODO: this would be better if it returned results progressively
  // as each endpoint responds, rather than wait for them all to resolve.
  const promises = endpoints.map((endpoint) => searchEndpoint(query, endpoint));
  const results = await Promise.all(promises);
  return results.flat();
};

const useApiCombobox = (
  endpoints: SearchEndpoint[],
  initialEndpointName: string,
  allowSourceSelection: boolean = false,
) => {
  const [endpointName, setEndpointName] = useState<string>(initialEndpointName);
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue) {
        setIsLoading(true);
        const currentEndpoint = endpoints.find((e) => e.name === endpointName);

        const promise =
          allowSourceSelection && currentEndpoint
            ? searchEndpoint(inputValue, currentEndpoint)
            : searchAllEndpoints(inputValue, endpoints);

        promise.then(setSearchResults).finally(() => setIsLoading(false));
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, endpointName, allowSourceSelection, endpoints]);

  return {
    endpointName,
    setEndpointName,
    inputValue,
    setInputValue,
    searchResults,
    setSearchResults,
    isLoading,
  };
};

export const ApiComboboxSingle = ({
  allowSourceSelection = false,
  endpoints = [],
  value,
  onValueChange,
  title = "Select Item",
  placeholder = "Nothing selected",
}: {
  allowSourceSelection?: boolean;
  endpoints?: SearchEndpoint[];
  value?: ResultItem | null;
  onValueChange?: (value: ResultItem | null) => void;
  title?: string;
  placeholder?: string;
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [internalSelectedValue, setInternalSelectedValue] =
    useState<ResultItem | null>(null);

  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalSelectedValue;

  const handleValueChange = (newValue: ResultItem | null) => {
    if (!isControlled) {
      setInternalSelectedValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const {
    endpointName,
    setEndpointName,
    inputValue,
    setInputValue,
    searchResults,
    setSearchResults,
    isLoading,
  } = useApiCombobox(endpoints, endpoints[0]?.name || "", allowSourceSelection);

  return (
    <div className="w-full space-y-4">
      {allowSourceSelection && (
        <div className="space-y-2">
          <Label>Source</Label>
          <RadioGroup
            defaultValue={endpoints[0]?.name}
            value={endpointName}
            onValueChange={(v) => {
              setEndpointName(v);
              setInputValue("");
              setSearchResults([]);
            }}
            className="flex gap-4 flex-wrap"
          >
            {endpoints.map((ep) => (
              <div key={ep.name} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={ep.name}
                  id={`single-r-${ep.name}-${id}`}
                />
                <Label htmlFor={`single-r-${ep.name}-${id}`}>{ep.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={id}>{title}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedValue ? (
                <span className="truncate">{selectedValue.label}</span>
              ) : (
                <span className="text-muted-foreground/80">{placeholder}</span>
              )}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={
                  allowSourceSelection
                    ? `Search ${
                        endpoints.find((e) => e.name === endpointName)?.label ||
                        endpointName
                      }...`
                    : "Search all sources..."
                }
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex justify-center py-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {searchResults.map((item) => {
                        const isSelected = selectedValue?.uri === item.uri;
                        return (
                          <CommandItem
                            key={item.uri}
                            value={item.uri}
                            onSelect={() => {
                              handleValueChange(item);
                              setOpen(false);
                            }}
                          >
                            <span className="truncate">{item.label}</span>
                            <span className="truncate">{item.description}</span>
                            {isSelected && (
                              <CheckIcon size={16} className="ml-auto" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

const ApiComboboxMultipleExpandable = ({
  allowSourceSelection = false,
  endpoints = [],
  maxShownItems,
  value,
  onValueChange,
  title = "Select Items",
  placeholder = "Nothing selected",
}: {
  allowSourceSelection?: boolean;
  endpoints?: SearchEndpoint[];
  maxShownItems?: number;
  value?: ResultItem[];
  onValueChange?: (value: ResultItem[]) => void;
  title?: string;
  placeholder?: string;
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [internalSelectedValues, setInternalSelectedValues] = useState<
    ResultItem[]
  >([]);

  const isControlled = value !== undefined;
  const selectedValues = isControlled ? value : internalSelectedValues;

  const handleValueChange = (newValues: ResultItem[]) => {
    if (!isControlled) {
      setInternalSelectedValues(newValues);
    }
    onValueChange?.(newValues);
  };

  const {
    endpointName,
    setEndpointName,
    inputValue,
    setInputValue,
    searchResults,
    setSearchResults,
    isLoading,
  } = useApiCombobox(endpoints, endpoints[0]?.name || "", allowSourceSelection);

  const toggleSelection = (item: ResultItem) => {
    const exists = selectedValues.some((v) => v.uri === item.uri);
    let newValues;
    if (exists) {
      newValues = selectedValues.filter((v) => v.uri !== item.uri);
    } else {
      newValues = [...selectedValues, item];
    }
    handleValueChange(newValues);
  };

  const removeSelection = (valueToRemove: string) => {
    const newValues = selectedValues.filter((v) => v.uri !== valueToRemove);
    handleValueChange(newValues);
  };

  // Determine visible items based on maxShownItems
  const visibleItems =
    maxShownItems === undefined
      ? selectedValues
      : expanded
        ? selectedValues
        : selectedValues.slice(0, maxShownItems);
  const hiddenCount =
    maxShownItems === undefined
      ? 0
      : selectedValues.length - visibleItems.length;

  return (
    <div className="w-full space-y-4">
      {allowSourceSelection && (
        <div className="space-y-2">
          <Label>Source</Label>
          <RadioGroup
            defaultValue={endpoints[0]?.name}
            value={endpointName}
            onValueChange={(v) => {
              setEndpointName(v);
              setInputValue("");
              setSearchResults([]);
            }}
            className="flex gap-4 flex-wrap"
          >
            {endpoints.map((ep) => (
              <div key={ep.name} className="flex items-center space-x-2">
                <RadioGroupItem value={ep.name} id={`r-${ep.name}-${id}`} />
                <Label htmlFor={`r-${ep.name}-${id}`}>{ep.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={id}>{title}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-8 w-full justify-between hover:bg-transparent"
            >
              <div className="flex flex-wrap items-center gap-1 pr-2.5">
                {selectedValues.length > 0 ? (
                  <>
                    {visibleItems.map((item) => (
                      <Badge
                        key={item.uri}
                        variant="outline"
                        className="rounded-sm"
                      >
                        {item.label}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelection(item.uri);
                          }}
                          asChild
                        >
                          <span>
                            <XIcon className="size-3" />
                          </span>
                        </Button>
                      </Badge>
                    ))}
                    {maxShownItems !== undefined &&
                    (hiddenCount > 0 || expanded) ? (
                      <Badge
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((prev) => !prev);
                        }}
                        className="rounded-sm cursor-pointer text-foreground/70 hover:text-foreground"
                      >
                        {expanded ? "Show Less" : `+${hiddenCount} more`}
                      </Badge>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted-foreground/80">
                    {placeholder}
                  </span>
                )}
              </div>
              <ChevronsUpDownIcon
                className="text-muted-foreground/80 shrink-0"
                aria-hidden="true"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={
                  allowSourceSelection
                    ? `Search ${
                        endpoints.find((e) => e.name === endpointName)?.label ||
                        endpointName
                      }...`
                    : "Search all sources..."
                }
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex justify-center py-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {searchResults.map((item) => {
                        const isSelected = selectedValues.some(
                          (v) => v.uri === item.uri,
                        );
                        return (
                          <CommandItem
                            className="grid"
                            key={item.uri}
                            value={item.uri}
                            onSelect={() => toggleSelection(item)}
                          >
                            {item.description ? (
                              <>
                                <span className="flex font-bold">
                                  <CheckIcon
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {item.label}
                                </span>
                                <span className="ml-8 font-light wrap-break-word truncate">
                                  {item.description}
                                </span>
                              </>
                            ) : (
                              <span className="flex">
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {item.label}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ApiComboboxMultipleExpandable;
