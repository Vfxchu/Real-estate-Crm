import * as React from "react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CLEAR_SENTINEL = "__CLEAR__";

export type Option = { 
  value: string; 
  label: string; 
};

export type ClearableSelectProps = {
  value?: string | null;
  onChange: (value: string | undefined) => void;
  options: Option[];
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  disabled?: boolean;
};

export default function ClearableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  allowClear = true,
  className,
  disabled,
}: ClearableSelectProps) {
  // Handle value change
  const handleValueChange = (newValue: string) => {
    console.log('ClearableSelect onChange:', { newValue, sentinel: CLEAR_SENTINEL });
    if (newValue === CLEAR_SENTINEL) {
      onChange(undefined);
    } else {
      onChange(newValue);
    }
  };

  // Determine the current select value
  const selectValue = value || undefined;

  return (
    <Select 
      value={selectValue} 
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-50 bg-background">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        
        {allowClear && options.length > 0 && value && (
          <>
            <SelectSeparator />
            <SelectItem value={CLEAR_SENTINEL}>
              Clear
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}