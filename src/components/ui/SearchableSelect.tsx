import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  allowAddNew?: boolean;
  onAddNew?: (value: string) => Promise<SearchableSelectOption | null>;
  addNewLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
  allowAddNew = false,
  onAddNew,
  addNewLabel = "Add New",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showAddNew, setShowAddNew] = React.useState(false);
  const [newValue, setNewValue] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleAddNew = async () => {
    if (!newValue.trim() || !onAddNew) return;
    
    setAdding(true);
    try {
      const result = await onAddNew(newValue.trim());
      if (result) {
        onValueChange(result.value);
        setNewValue("");
        setShowAddNew(false);
        setOpen(false);
      }
    } finally {
      setAdding(false);
    }
  };

  if (showAddNew) {
    return (
      <div className="space-y-2">
        <Input
          placeholder={`Enter new ${placeholder.toLowerCase().replace('select ', '').replace('...', '')}`}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          disabled={adding}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!newValue.trim() || adding}
            onClick={handleAddNew}
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddNew(false);
              setNewValue("");
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {allowAddNew && onAddNew && (
                <CommandItem
                  value="__add_new__"
                  onSelect={() => {
                    setShowAddNew(true);
                    setOpen(false);
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {addNewLabel}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
