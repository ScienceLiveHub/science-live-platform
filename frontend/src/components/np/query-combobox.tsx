// --- QUERY search combobox -----------------------------------------
// Uses ApiComboboxSingle UI pattern but with custom search query function

import { ResultItem } from "@/components/np/api-endpoints";
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
import { CheckIcon, ChevronsUpDownIcon, Loader2, XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

export function QueryComboboxField({
  value,
  onValueChange,
  searchFunction,
  labelText,
  instructionText,
  placeholderText,
}: {
  value: ResultItem | null;
  onValueChange: (item: ResultItem | null) => void;
  searchFunction: (term: string) => Promise<ResultItem[]>;
  labelText?: string;
  instructionText?: string;
  placeholderText?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!inputValue || inputValue.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(true);
      searchFunction(inputValue)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id}>{labelText ?? "Search"}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {value ? (
                <span className="truncate">{value.label}</span>
              ) : (
                <span className="text-muted-foreground/80">
                  {instructionText ?? "Type to search..."}
                </span>
              )}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {value && (
            <button
              type="button"
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValueChange(null);
              }}
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholderText ?? "Search..."}
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
                  <CommandEmpty>
                    {inputValue.length < 2
                      ? "Type at least 2 characters to search..."
                      : "No results found."}
                  </CommandEmpty>
                  <CommandGroup>
                    {results.map((item) => (
                      <CommandItem
                        key={item.uri}
                        value={item.uri}
                        onSelect={() => {
                          onValueChange(item);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{item.label}</span>
                        {value?.uri === item.uri && (
                          <CheckIcon size={16} className="ml-auto" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
