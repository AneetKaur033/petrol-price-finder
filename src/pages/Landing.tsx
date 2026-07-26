import { FUEL_TYPES, GRADIENT_BG, FONT_FAMILY } from '../types'
import SearchPanel from '../components/SearchPanel'

interface LandingProps {
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

export default function Landing({
  search,
  fuelType,
  loading,
  locationLoading,
  error,
  onSearchChange,
  onSearch,
  onUseLocation,
  onFuelTypeChange,
}: LandingProps) {
  return (
    <div style={{ background: GRADIENT_BG, fontFamily: FONT_FAMILY }}>

      {/* Nav */}
      <div className="px-8 py-5 flex justify-center" style={{ backgroundColor: 'transparent' }}>
        <div className="inline-flex px-4 py-2" style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h1 className="text-base font-bold" style={{ color: '#0f1535' }}>
            fuel<span style={{ color: '#4c6ef5' }}>finder</span>
            <span className="text-xs font-normal ml-2 px-2 py-0.5" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '4px' }}>NSW</span>
          </h1>
        </div>
      </div>

      {/* Hero */}
      <div className="min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-8 py-12 w-full flex flex-col md:flex-row items-center gap-16">

          {/* Left */}
          <div className="flex-1">
            <h2 className="font-bold leading-none mb-8" style={{ color: '#0f172a', fontSize: '80px', letterSpacing: '-2px' }}>
              Stop<br />overpaying<br />at the<br />pump.
            </h2>
            <p className="text-lg font-light mb-2" style={{ color: '#475569', maxWidth: '440px', lineHeight: '1.7' }}>
              Real-time petrol prices from every station in NSW.
            </p>
            <p className="text-lg font-light mb-8" style={{ color: '#475569', maxWidth: '440px', lineHeight: '1.7' }}>
              Know the cheapest price before you leave — not after you've already pulled in.
            </p>
            <button
              onClick={() => {
                const target = window.innerWidth >= 768
                  ? document.getElementById('full-search')
                  : document.getElementById('search-panel')
                if (target) {
                  const y = target.getBoundingClientRect().top + window.scrollY
                  window.scrollTo({ top: y, behavior: 'smooth' })
                }
              }}
              className="px-8 py-4 text-white font-semibold text-base"
              style={{ backgroundColor: '#1d4ed8', borderRadius: '50px' }}
            >
              Find cheapest fuel →
            </button>
          </div>

          {/* Right: search panel */}
          <div id="search-panel">
            <SearchPanel
              search={search}
              fuelType={fuelType}
              loading={loading}
              locationLoading={locationLoading}
              error={error}
              onSearchChange={onSearchChange}
              onSearch={onSearch}
              onUseLocation={onUseLocation}
              onFuelTypeChange={onFuelTypeChange}
            />
          </div>
        </div>
      </div>

      {/* Full width search — desktop only */}
      <div
        id="full-search"
        className="hidden md:flex flex-col justify-center items-center min-h-screen px-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}
      >
        <div className="w-full max-w-xl">
          <p className="text-3xl font-bold mb-2 text-center" style={{ color: '#0f172a' }}>Find cheap fuel near you</p>
          <p className="text-sm text-center mb-8" style={{ color: '#64748b' }}>Enter your suburb or postcode below</p>

          <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Postcode or suburb</label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              placeholder="Suburb or postcode e.g. Bondi, 2026"
              className="flex-1 px-5 py-4 text-base focus:outline-none"
              style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
            />
            <button
              onClick={onUseLocation}
              disabled={locationLoading}
              className="flex items-center justify-center w-14 h-14 shrink-0"
              style={{ backgroundColor: '#0f1535', borderRadius: '8px', color: 'white' }}
            >
              {locationLoading ? (
                <span className="text-xs text-white">...</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            className="w-full px-5 py-4 text-base mb-6 focus:outline-none"
            style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
          >
            {FUEL_TYPES.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <button
            onClick={onSearch}
            disabled={loading}
            className="w-full py-4 text-base font-semibold text-white"
            style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
          >
            {loading ? 'Searching...' : 'Find cheapest fuel →'}
          </button>
        </div>
      </div>
    </div>
  )
}