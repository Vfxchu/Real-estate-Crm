// Bedroom enum options for property forms
export const BEDROOM_OPTIONS = [
  { value: 'Studio', label: 'Studio' },
  { value: '1 BHK', label: '1 BHK' },
  { value: '2 BHK', label: '2 BHK' },
  { value: '3 BHK', label: '3 BHK' },
  { value: '4 BHK', label: '4 BHK' },
  { value: '5 BHK', label: '5 BHK' },
  { value: '6 BHK', label: '6 BHK' },
];

export type BedroomEnum = typeof BEDROOM_OPTIONS[number]['value'];

// Map bedroom enum to number for API compatibility
export const bedroomEnumToNumber = (bedroom: BedroomEnum | string): number => {
  switch (bedroom) {
    case 'Studio': return 0;
    case '1 BHK': return 1;
    case '2 BHK': return 2;
    case '3 BHK': return 3;
    case '4 BHK': return 4;
    case '5 BHK': return 5;
    case '6 BHK': return 6;
    default: return 0;
  }
};

// Map number to bedroom enum for display
export const numberToBedroomEnum = (bedrooms: number | null | undefined): BedroomEnum => {
  switch (bedrooms) {
    case 0: return 'Studio';
    case 1: return '1 BHK';
    case 2: return '2 BHK';
    case 3: return '3 BHK';
    case 4: return '4 BHK';
    case 5: return '5 BHK';
    case 6: return '6 BHK';
    default: return 'Studio';
  }
};