import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
];

interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultCountryCode?: string;
}

function parsePhoneNumber(fullNumber: string): { countryCode: string; number: string } {
  // Check if number starts with a country code
  for (const cc of COUNTRY_CODES) {
    if (fullNumber.startsWith(cc.code)) {
      return {
        countryCode: cc.code,
        number: fullNumber.slice(cc.code.length).replace(/^\s+/, ""),
      };
    }
  }
  
  // Default to UAE if no match
  return {
    countryCode: "+971",
    number: fullNumber.replace(/^\+/, ""),
  };
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "Phone number",
  className,
  disabled = false,
  defaultCountryCode = "+971",
}: PhoneInputProps) {
  const parsed = React.useMemo(() => {
    if (!value) return { countryCode: defaultCountryCode, number: "" };
    return parsePhoneNumber(value);
  }, [value, defaultCountryCode]);

  const [countryCode, setCountryCode] = React.useState(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = React.useState(parsed.number);

  // Update local state when value prop changes
  React.useEffect(() => {
    const newParsed = parsePhoneNumber(value || "");
    if (value) {
      setCountryCode(newParsed.countryCode);
      setPhoneNumber(newParsed.number);
    }
  }, [value]);

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const fullNumber = phoneNumber ? `${newCode}${phoneNumber}` : "";
    onChange(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d\s-]/g, "");
    setPhoneNumber(newNumber);
    const fullNumber = newNumber ? `${countryCode}${newNumber}` : "";
    onChange(fullNumber);
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode);

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[120px] shrink-0">
          <SelectValue>
            {selectedCountry ? (
              <span className="flex items-center gap-1">
                <span>{selectedCountry.flag}</span>
                <span className="text-xs">{selectedCountry.code}</span>
              </span>
            ) : (
              "+971"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-50 max-h-[300px]">
          {COUNTRY_CODES.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              <span className="flex items-center gap-2">
                <span>{cc.flag}</span>
                <span>{cc.code}</span>
                <span className="text-muted-foreground text-xs">{cc.country}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}
