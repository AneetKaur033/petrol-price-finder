import { FUEL_TYPES } from '../types'

interface SearchPanelProps {
  search: string
  fuelType: string
  loading: boolean
  locationLoading: boolean
  error: string | null
  onSearchChange: (value: string) => void
  onSearch: () => void
  onUseLocation: () => void
  onFuelTypeChange: (fuel: string) => void
}

export default function SearchPanel({
  search,
  fuelType,
  loading,
  locationLoading,
  error,
  onSearchChange,
  onSearch,
  onUseLocation,
  onFuelTypeChange,
}: SearchPanelProps) {
  return (
    <div className="w-full md:w-96 p-8 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)' }}>
      <p className="font-semibold text-base mb-1" style={{ color: '#0f172a' }}>Search live prices</p>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>No account, no saved location.</p>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Postcode or suburb</label>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="e.g. Bondi or 2026"
          className="flex-1 px-4 py-3 text-sm focus:outline-none"
          style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
        />
        <button
          onClick={onUseLocation}
          disabled={locationLoading}
          className="flex items-center justify-center w-12 h-12 shrink-0"
          style={{ backgroundColor: '#0f1535', borderRadius: '8px', color: 'white' }}
          title="Use my location"
        >
          {locationLoading ? (
            <span className="text-xs">...</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
              <circle cx="12" cy="12" r="7"/>
            </svg>
          )}
        </button>
      </div>

      <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Fuel type</label>
      <select
        value={fuelType}
        onChange={e => onFuelTypeChange(e.target.value)}
        className="w-full px-4 py-3 text-sm mb-4 focus:outline-none"
        style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
      >
        {FUEL_TYPES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <button
        onClick={onSearch}
        disabled={loading}
        className="w-full py-4 text-sm font-semibold text-white"
        style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
      >
        {loading ? 'Searching...' : 'Find cheapest fuel'}
      </button>
    </div>
  )
}