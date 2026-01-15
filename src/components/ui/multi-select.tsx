import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      options,
      value = [],
      onValueChange,
      placeholder = "Select options...",
      maxCount = 3,
      className,
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const selectedValues = value;

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
      if (disabled) return;
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onValueChange(newValues);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onValueChange([]);
    };

    const handleRemove = (e: React.MouseEvent, optionValue: string) => {
      e.stopPropagation();
      if (disabled) return;
      onValueChange(selectedValues.filter((v) => v !== optionValue));
    };

    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <div
          ref={ref}
          role="combobox"
          aria-expanded={isOpen}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex flex-wrap gap-1 items-center min-h-[24px] w-full rounded-md border border-input bg-background px-2 py-1 text-xs cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "ring-1 ring-ring"
          )}
        >
          {selectedValues.length > 0 ? (
            <>
              {selectedValues.slice(0, maxCount).map((val) => {
                const option = options.find((o) => o.value === val);
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="text-xs px-1 py-0 h-4 gap-0.5"
                  >
                    <span className="truncate max-w-[60px]">{option?.label || val}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="hover:bg-muted rounded-sm cursor-pointer"
                      onClick={(e) => handleRemove(e, val)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRemove(e as any, val);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                );
              })}
              {selectedValues.length > maxCount && (
                <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                  +{selectedValues.length - maxCount}
                </Badge>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {selectedValues.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                className="hover:bg-muted rounded-sm p-0.5 cursor-pointer"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as any);
                  }
                }}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-transparent border-b outline-none placeholder:text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-[150px] overflow-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2">No results</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(option.value);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
