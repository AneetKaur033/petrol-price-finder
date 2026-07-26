import { FUEL_TYPES, GRADIENT_BG, FONT_FAMILY } from '../types'

interface NavProps {
  onBack?: () => void
  fuelType?: string
  onFuelTypeChange?: (fuel: string) => void
  showBack?: boolean
}

export default function Nav({ onBack, fuelType, onFuelTypeChange, showBack = false }: NavProps) {
  return (
    <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'transparent', fontFamily: FONT_FAMILY }}>
      {showBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#374151' }}
        >
          ← Back
        </button>
      ) : (
        <div style={{ width: '80px' }} />
      )}

      <div className="px-4 py-2" style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 className="text-base font-bold" style={{ color: '#0f1535' }}>
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
          <span className="text-xs font-normal ml-2 px-2 py-0.5" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '4px' }}>NSW</span>
        </h1>
      </div>

      {showBack && fuelType && onFuelTypeChange ? (
        <select
          value={fuelType}
          onChange={e => onFuelTypeChange(e.target.value)}
          className="px-4 py-2 text-sm font-medium focus:outline-none"
          style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', color: '#0f172a' }}
        >
          {FUEL_TYPES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      ) : (
        <div style={{ width: '80px' }} />
      )}
    </div>
  )
}