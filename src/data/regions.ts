export const COUNTRY_ORDER = ['india', 'nepal', 'thailand'] as const;

export const REGIONS_BY_COUNTRY: Record<(typeof COUNTRY_ORDER)[number], string[]> = {
  india: [
    'uttarakhand',
    'himachal-pradesh',
    'ladakh',
    'jammu-kashmir',
    'sikkim',
    'west-bengal',
    'maharashtra',
  ],
  nepal: ['khumbu', 'annapurna', 'langtang', 'manaslu', 'mustang', 'kanchenjunga'],
  thailand: ['northern-thailand', 'central-thailand', 'southern-thailand'],
};

// Kept for backwards compatibility where only India's region order is needed.
export const REGION_ORDER = REGIONS_BY_COUNTRY.india;

export const DIFFICULTIES = ['Easy', 'Moderate', 'Difficult', 'Strenuous'] as const;
