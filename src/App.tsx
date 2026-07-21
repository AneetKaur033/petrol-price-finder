import { useState } from 'react'

interface Station {
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

interface Price {
  stationcode: number
  fueltype: string
  price: number
  lastupdated: string
}

interface FuelData {
  stations: Station[]
  prices: Price[]
}

const FUEL_TYPES = [
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

type SortMode = 'price' | 'distance'
type Page = 'landing' | 'results'

const MEMBERS_ONLY_KEYWORDS = ['costco', 'members only', 'members-only']

function isMembersOnly(name: string) {
  return MEMBERS_ONLY_KEYWORDS.some(k => name.toLowerCase().includes(k))
}

function App() {
  const [page, setPage] = useState<Page>('landing')
  const [search, setSearch] = useState('')
  const [fuelType, setFuelType] = useState('E10')
  const [data, setData] = useState<FuelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('price')
  const [lastSearchCoords, setLastSearchCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [searchLabel, setSearchLabel] = useState<string | null>(null)
  const [activeFuel, setActiveFuel] = useState('E10')
  const [confirmStation, setConfirmStation] = useState<Station | null>(null)
  const [tankSize, setTankSize] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)

  const RADIUS = 3

  const litresNeeded = tankSize && fuelLevel
    ? parseFloat(tankSize) * (1 - parseFloat(fuelLevel) / 100)
    : null

  function getFillCost(pricePerLitre: number): string | null {
    if (!litresNeeded) return null
    const cost = (pricePerLitre / 100) * litresNeeded
    return `$${cost.toFixed(2)}`
  }

  async function fetchByCoords(lat: number, lng: number, fuel: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/fuel?lat=${lat}&lng=${lng}&radius=${RADIUS}&fueltype=${fuel}`)
      const json = await res.json()
      if (json.errorDetails) throw new Error(json.errorDetails.message)
      setData(json)
      setLastSearchCoords({ lat, lng })
      setActiveFuel(fuel)
      setPage('results')
    } catch (e: any) {
      setError(e.message || 'Failed to fetch prices')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    setLoading(true)
    setError(null)
    try {
      if (lastSearchCoords && search === searchLabel) {
        await fetchByCoords(lastSearchCoords.lat, lastSearchCoords.lng, fuelType)
        return
      }
      if (!search.trim()) {
        setError('Please enter a suburb or use your location.')
        setLoading(false)
        return
      }
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ', NSW, Australia')}&format=json&limit=1&addressdetails=1`
      )
      const geoData = await geoRes.json()
      if (!geoData.length) throw new Error('Suburb or postcode not found')
      const { lat, lon, address } = geoData[0]
      const suburb = address?.suburb || address?.town || address?.village || search
      const postcode = address?.postcode || ''
      setSearchLabel(`${suburb}${postcode ? ` (${postcode})` : ''}`)
      await fetchByCoords(parseFloat(lat), parseFloat(lon), fuelType)
    } catch (e: any) {
      setError(e.message || 'Failed to find location')
      setLoading(false)
    }
  }

  async function handleUseLocation() {
    setLocationLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          )
          const data = await res.json()
          const suburb = data?.address?.suburb || data?.address?.town || 'your location'
          setSearchLabel(suburb)
          setSearch(suburb)
        } catch {
          setSearchLabel('your location')
          setSearch('your location')
        }
        setLastSearchCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
      },
      () => {
        setError('Location access denied. Please enter a suburb instead.')
        setLocationLoading(false)
      }
    )
  }

  async function handleFuelTypeChange(newFuel: string) {
    setFuelType(newFuel)
    setActiveFuel(newFuel)
    if (lastSearchCoords) {
      await fetchByCoords(lastSearchCoords.lat, lastSearchCoords.lng, newFuel)
    }
  }

  function openGoogleMaps(station: Station) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address)}`
    window.open(url, '_blank')
    setConfirmStation(null)
  }

  const getPrice = (stationCode: number) => {
    return data?.prices.find(p => p.stationcode === stationCode && p.fueltype === activeFuel)
  }

  const avgPrice = data
    ? (() => {
        const prices = data.prices.filter(p => p.fueltype === activeFuel)
        if (!prices.length) return null
        return prices.reduce((sum, p) => sum + p.price, 0) / prices.length
      })()
    : null

  const getPriceColor = (price: number) => {
    if (!avgPrice) return '#0f172a'
    if (price <= avgPrice - 3) return '#16a34a'
    if (price >= avgPrice + 3) return '#dc2626'
    return '#ea580c'
  }

  const getSortedStations = () => {
    if (!data) return []
    const withPrices = data.stations
      .map(station => ({ station, price: getPrice(station.code) }))
      .filter(item => item.price !== undefined)

    if (sortMode === 'price') {
      return withPrices.sort((a, b) => a.price!.price - b.price!.price).slice(0, 10)
    } else {
      return withPrices.sort((a, b) => a.station.location.distance - b.station.location.distance).slice(0, 10)
    }
  }

  const sortedStations = getSortedStations()
  const cheapestPrice = sortedStations.length > 0 ? sortedStations[0].price?.price : null

  const gradientBg = 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 40%, #ccfbf1 100%)'
  const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

  // ─── LANDING PAGE ───────────────────────────────────────────────
  if (page === 'landing') {
    return (
      <div style={{ background: gradientBg, fontFamily }}>

        {/* Nav */}
        <div className="px-8 py-5" style={{ backgroundColor: 'transparent' }}>
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
            <div id="search-panel" className="w-full md:w-96 p-8 shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)' }}>
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
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Bondi or 2026"
                  className="flex-1 px-4 py-3 text-sm focus:outline-none"
                  style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
                />
                <button
                  onClick={handleUseLocation}
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
                onChange={e => setFuelType(e.target.value)}
                className="w-full px-4 py-3 text-sm mb-4 focus:outline-none"
                style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
              >
                {FUEL_TYPES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full py-4 text-sm font-semibold text-white"
                style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
              >
                {loading ? 'Searching...' : 'Find cheapest fuel'}
              </button>
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
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Suburb or postcode e.g. Bondi, 2026"
                className="flex-1 px-5 py-4 text-base focus:outline-none"
                style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
              />
              <button
                onClick={handleUseLocation}
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
              onChange={e => setFuelType(e.target.value)}
              className="w-full px-5 py-4 text-base mb-6 focus:outline-none"
              style={{ border: '1px solid #e2e8f0', color: '#0f172a', backgroundColor: 'white', borderRadius: '8px' }}
            >
              {FUEL_TYPES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <button
              onClick={handleSearch}
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

  // ─── RESULTS PAGE ───────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: gradientBg, fontFamily }}>

      {/* Google Maps Confirmation Modal */}
      {confirmStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmStation(null)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-base mb-1" style={{ color: '#0f172a' }}>Open in Google Maps?</p>
            <p className="text-sm mb-1" style={{ color: '#64748b' }}>{confirmStation.name}</p>
            <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>{confirmStation.address}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStation(null)}
                className="flex-1 py-2 text-sm font-medium"
                style={{ border: '1px solid #e2e8f0', color: '#374151', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => openGoogleMaps(confirmStation)}
                className="flex-1 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
              >
                Open Google Maps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Nav */}
      <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'transparent' }}>
        <button
          onClick={() => setPage('landing')}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: '#374151' }}
        >
          ← Back
        </button>

        <div className="px-4 py-2" style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h1 className="text-base font-bold" style={{ color: '#0f1535' }}>
            fuel<span style={{ color: '#4c6ef5' }}>finder</span>
            <span className="text-xs font-normal ml-2 px-2 py-0.5" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '4px' }}>NSW</span>
          </h1>
        </div>

        <select
          value={fuelType}
          onChange={e => handleFuelTypeChange(e.target.value)}
          className="px-4 py-2 text-sm font-medium focus:outline-none"
          style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', color: '#0f172a' }}
        >
          {FUEL_TYPES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: '#64748b' }}>Finding cheapest prices...</div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-2xl mx-auto px-4 pb-10">

          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm" style={{ color: '#475569' }}>
                Near <span className="font-semibold" style={{ color: '#0f172a' }}>{searchLabel}</span>
              </p>
              {data.stations.some(s => s.location.distance > RADIUS) && (
                <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                  Some stations beyond {RADIUS}km — closest available shown
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>Sort:</span>
              <div className="flex" style={{ backgroundColor: 'white', borderRadius: '50px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <button
                  onClick={() => setSortMode('price')}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: sortMode === 'price' ? '#1d4ed8' : 'transparent',
                    color: sortMode === 'price' ? 'white' : '#374151',
                  }}
                >
                  Price
                </button>
                <button
                  onClick={() => setSortMode('distance')}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: sortMode === 'distance' ? '#1d4ed8' : 'transparent',
                    color: sortMode === 'distance' ? 'white' : '#374151',
                  }}
                >
                  Distance
                </button>
              </div>
            </div>
          </div>

          {/* Fill Cost Calculator toggle */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full mb-4 py-3 text-sm font-medium flex items-center justify-between px-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.9)', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <span>Use tank size and level to see exact fill cost</span>
            <span style={{ color: '#1d4ed8' }}>{showCalculator ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {/* Fill Cost Calculator */}
          {showCalculator && (
            <div className="mb-4 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Tank size (litres)</label>
                  <input
                    type="number"
                    value={tankSize}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      if (e.target.value === '' || val > 0) setTankSize(e.target.value)
                    }}
                    placeholder="e.g. 50"
                    min="1"
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Current level (%)</label>
                  <input
                    type="number"
                    value={fuelLevel}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      if (e.target.value === '' || (val >= 0 && val <= 100)) setFuelLevel(e.target.value)
                    }}
                    placeholder="e.g. 25"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#0f172a' }}
                  />
                </div>
              </div>
              {litresNeeded && (
                <p className="text-xs mt-2" style={{ color: '#64748b' }}>
                  You need <span className="font-semibold" style={{ color: '#0f172a' }}>{litresNeeded.toFixed(1)}L</span> to fill up
                </p>
              )}
            </div>
          )}

          {data.stations.length === 0 && (
            <div className="px-4 py-8 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px' }}>
              <p className="text-sm" style={{ color: '#64748b' }}>
                No stations found near {searchLabel || 'this location'}.
              </p>
              <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>Try searching a nearby suburb.</p>
            </div>
          )}

          <div className="space-y-3">
            {getSortedStations().map(({ station, price }, index) => {
              const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null
              const membersOnly = isMembersOnly(station.name)
              const fillCost = getFillCost(price!.price)
              const cheapestFillCost = cheapestPrice && litresNeeded ? (cheapestPrice / 100) * litresNeeded : null
              const thisFillCost = litresNeeded ? (price!.price / 100) * litresNeeded : null
              const fillSaving = cheapestFillCost && thisFillCost && index > 0
                ? (thisFillCost - cheapestFillCost).toFixed(2)
                : null

              return (
                <div
                  key={station.code}
                  onClick={() => setConfirmStation(station)}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.9)',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 mr-4">
                      {membersOnly && (
                        <div className="mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5" style={{ backgroundColor: '#fef9c3', color: '#854d0e', borderRadius: '20px' }}>
                            Members only
                          </span>
                        </div>
                      )}
                      <h2 className="font-semibold text-base leading-tight mb-1" style={{ color: '#0f172a' }}>{station.name}</h2>
                      <p className="text-xs" style={{ color: '#64748b' }}>{station.address}</p>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{station.location.distance.toFixed(1)} km away</p>
                    </div>

                    <div className="shrink-0 text-right">
                      {fillCost ? (
                        <>
                          <p className="text-3xl font-bold leading-none" style={{ color: '#16a34a' }}>{fillCost}</p>
                          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{price!.price}¢/litre</p>
                          {fillSaving && parseFloat(fillSaving) > 0 && (
                            <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>+${fillSaving} vs cheapest</p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-3xl font-bold leading-none" style={{ color: getPriceColor(price!.price) }}>{price!.price}</p>
                          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>¢/litre</p>
                          {saving && parseFloat(saving) > 0 && (
                            <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Save {saving}¢</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-center mt-6" style={{ color: '#94a3b8' }}>
            {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
          </p>
        </div>
      )}
    </div>
  )
}

export default App