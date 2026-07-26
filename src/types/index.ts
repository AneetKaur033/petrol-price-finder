export interface Station {
  code: number
  name: string
  address: string
  brand: string
  location: {
    distance: number
    latitude: number
    longitude: number
  }
}

export interface Price {
  stationcode: number
  fueltype: string
  price: number
  lastupdated: string
}

export interface FuelData {
  stations: Station[]
  prices: Price[]
}

export const FUEL_TYPES = [
  { value: 'E10', label: 'Ethanol 94 (E10)' },
  { value: 'U91', label: 'Unleaded 91 (U91)' },
  { value: 'P95', label: 'Premium 95 (P95)' },
  { value: 'P98', label: 'Premium 98 (P98)' },
  { value: 'DL', label: 'Diesel (DL)' },
  { value: 'PDL', label: 'Premium Diesel (PDL)' },
  { value: 'E85', label: 'Ethanol 105 (E85)' },
  { value: 'B20', label: 'Biodiesel 20 (B20)' },
  { value: 'EV', label: 'EV Charge' },
  { value: 'LPG', label: 'LPG' },
  { value: 'LNG', label: 'LNG' },
  { value: 'H2', label: 'Hydrogen (H2)' },
  { value: 'CNG', label: 'CNG/NGV' },
]

export const MEMBERS_ONLY_KEYWORDS = ['costco', 'members only', 'members-only']

export function isMembersOnly(name: string) {
  return MEMBERS_ONLY_KEYWORDS.some(k => name.toLowerCase().includes(k))
}

export const GRADIENT_BG = 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 40%, #ccfbf1 100%)'
export const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
export const RADIUS = 3