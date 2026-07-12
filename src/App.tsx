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
  const [expandedStation, setExpandedStation] = useState<number | null>(null)
  const [tankSize, setTankSize] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')

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
    if (!search.trim()) return
    setLoading(true)
    setError(null)
    try {
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
        } catch {
          setSearchLabel('your location')
        }
        await fetchByCoords(pos.coords.latitude, pos.coords.longitude, fuelType)
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
    if (lastSearchCoords) {
      await fetchByCoords(lastSearchCoords.lat, lastSearchCoords.lng, newFuel)
    }
  }

  function handleCardClick(station: Station, stationIndex: number) {
    if (expandedStation === stationIndex) {
      setConfirmStation(station)
    } else {
      setExpandedStation(stationIndex)
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
    if (!avgPrice) return '#0f1535'
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

  // ─── LANDING PAGE ───────────────────────────────────────────────
  if (page === 'landing') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f0f4ff' }}>

        {/* Nav */}
        <div className="px-8 py-5 flex items-center justify-between" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <h1 className="text-xl font-bold" style={{ color: '#0f1535' }}>
            fuel<span style={{ color: '#4c6ef5' }}>finder</span>
            <span className="text-xs font-normal ml-2 px-2 py-0.5" style={{ backgroundColor: '#e8edff', color: '#4c6ef5' }}>NSW</span>
          </h1>
        </div>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-12">

          {/* Left: Headline */}
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#4c6ef5' }}>
              Live NSW Fuel Prices
            </p>
            <h2 className="text-5xl font-bold leading-tight mb-6" style={{ color: '#0f1535' }}>
              Stop overpaying<br />at the pump.
            </h2>
            <p className="text-lg mb-8" style={{ color: '#6b7280' }}>
              Real-time petrol prices from every station in NSW. Find the cheapest fuel near you before you leave — not after you've already pulled in.
            </p>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16a34a' }}></div>
                <span className="text-sm" style={{ color: '#6b7280' }}>Live prices</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4c6ef5' }}></div>
                <span className="text-sm" style={{ color: '#6b7280' }}>2,500+ stations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ea580c' }}></div>
                <span className="text-sm" style={{ color: '#6b7280' }}>No account needed</span>
              </div>
            </div>
          </div>

          {/* Right: Search panel */}
          <div className="w-full md:w-96 p-8 shadow-xl" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
            <p className="font-bold text-lg mb-1" style={{ color: '#0f1535' }}>Find cheap fuel</p>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Enter your suburb or use your location</p>

            {error && (
              <div className="mb-4 px-3 py-2 text-sm" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            {/* Location button */}
            <button
              onClick={handleUseLocation}
              disabled={locationLoading}
              className="w-full py-3 text-sm font-semibold text-white mb-3 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#0f1535' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
                <circle cx="12" cy="12" r="7"/>
              </svg>
              {locationLoading ? 'Locating...' : 'Use my current location'}
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
              <span className="text-xs" style={{ color: '#9ca3af' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }}></div>
            </div>

            {/* Search input */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Suburb or postcode e.g. Bondi, 2026"
              className="w-full px-4 py-3 text-sm mb-3 focus:outline-none"
              style={{ border: '1px solid #d1d5db', color: '#0f1535', backgroundColor: '#f9fafb' }}
            />

            {/* Fuel type */}
            <select
              value={fuelType}
              onChange={e => setFuelType(e.target.value)}
              className="w-full px-4 py-3 text-sm mb-4 focus:outline-none"
              style={{ border: '1px solid #d1d5db', color: '#0f1535', backgroundColor: '#f9fafb' }}
            >
              {FUEL_TYPES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: '#4c6ef5' }}
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
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>

      {/* Google Maps Confirmation Modal */}
      {confirmStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setConfirmStation(null)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-base mb-1" style={{ color: '#0f1535' }}>Open in Google Maps?</p>
            <p className="text-sm mb-1" style={{ color: '#6b7280' }}>{confirmStation.name}</p>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>{confirmStation.address}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStation(null)}
                className="flex-1 py-2 text-sm font-medium"
                style={{ border: '1px solid #d1d5db', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={() => openGoogleMaps(confirmStation)}
                className="flex-1 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: '#4c6ef5' }}
              >
                Open Google Maps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Nav */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: '#0f1535', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={() => setPage('landing')}
          className="text-sm flex items-center gap-1.5 px-3 py-1.5"
          style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          ← Back
        </button>

        <h1 className="text-base font-bold">
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
        </h1>

        {/* Fuel type pills */}
        <div className="flex items-center gap-2 overflow-x-auto ml-2">
          {FUEL_TYPES.map(f => (
            <button
              key={f.value}
              onClick={() => handleFuelTypeChange(f.value)}
              className="text-xs px-2.5 py-1 font-medium shrink-0"
              style={{
                backgroundColor: fuelType === f.value ? '#4c6ef5' : 'transparent',
                color: fuelType === f.value ? 'white' : 'rgba(255,255,255,0.6)',
                border: fuelType === f.value ? '1px solid #4c6ef5' : '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {f.value}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: '#6b7280' }}>Finding cheapest prices...</div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-2xl mx-auto px-4 mt-6 pb-10">

          {searchLabel && (
            <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
              Showing results near <span className="font-semibold" style={{ color: '#0f1535' }}>{searchLabel}</span> within {RADIUS}km
            </p>
          )}

          {/* Fill Cost Calculator */}
          <div
            className="mb-5 p-4"
            style={{ backgroundColor: '#0f1535', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Fill Cost Calculator
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Tank size (litres)</label>
                <input
                  type="number"
                  value={tankSize}
                  onChange={e => {
                    const val = parseFloat(e.target.value)
                    if (e.target.value === '' || val > 0) setTankSize(e.target.value)
                  }}
                  placeholder="e.g. 50"
                  min="1"
                  className="w-full px-3 py-2 text-sm focus:outline-none text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#1a2150' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Current level (%)</label>
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
                  className="w-full px-3 py-2 text-sm focus:outline-none text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#1a2150' }}
                />
              </div>
            </div>
            {litresNeeded && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                You need <span className="font-semibold text-white">{litresNeeded.toFixed(1)}L</span> to fill up
              </p>
            )}
          </div>

          {data.stations.length === 0 && (
            <div className="px-4 py-8 text-center" style={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                No stations found within {RADIUS}km of {searchLabel || 'this location'}.
              </p>
              <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>Try searching a nearby suburb.</p>
            </div>
          )}

          {data.stations.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>Sort by</span>
                  <div className="flex" style={{ border: '1px solid #d1d5db' }}>
                    <button
                      onClick={() => setSortMode('price')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'price' ? '#0f1535' : 'transparent',
                        color: sortMode === 'price' ? 'white' : '#374151',
                      }}
                    >
                      Price
                    </button>
                    <button
                      onClick={() => setSortMode('distance')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'distance' ? '#0f1535' : 'transparent',
                        color: sortMode === 'distance' ? 'white' : '#374151',
                        borderLeft: '1px solid #d1d5db',
                      }}
                    >
                      Distance
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
                </p>
              </div>

              <div className="space-y-2">
                {getSortedStations().map(({ station, price }, index) => {
                  const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null
                  const membersOnly = isMembersOnly(station.name)
                  const isExpanded = expandedStation === index
                  const fillCost = getFillCost(price!.price)
                  const cheapestFillCost = cheapestPrice && litresNeeded ? (cheapestPrice / 100) * litresNeeded : null
                  const thisFillCost = litresNeeded ? (price!.price / 100) * litresNeeded : null
                  const fillSaving = cheapestFillCost && thisFillCost && index > 0
                    ? (thisFillCost - cheapestFillCost).toFixed(2)
                    : null

                  return (
                    <div
                      key={station.code}
                      onClick={() => handleCardClick(station, index)}
                      className="flex items-center cursor-pointer"
                      style={{
                        backgroundColor: isExpanded ? '#f0f4ff' : 'white',
                        borderLeft: index === 0 ? '3px solid #16a34a' : '1px solid #e5e7eb',
                        borderTop: '1px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb',
                        borderBottom: '1px solid #e5e7eb',
                        padding: '12px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0f4ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? '#f0f4ff' : 'white')}
                    >
                      {/* Rank */}
                      <div
                        className="shrink-0 mr-4 text-center w-5"
                        style={{ color: index === 0 ? '#16a34a' : '#9ca3af' }}
                      >
                        <p className="text-sm font-bold">{index + 1}</p>
                      </div>

                      {/* Station info */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {index === 0 && (
                            <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                              {sortMode === 'price' ? 'CHEAPEST' : 'CLOSEST'}
                            </span>
                          )}
                          {membersOnly && (
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5"
                              style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}
                            >
                              MEMBERS ONLY
                            </span>
                          )}
                        </div>
                        <h2 className="font-bold text-sm leading-tight" style={{ color: '#0f1535' }}>{station.name}</h2>
                        <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                          {station.location.distance.toFixed(1)} km away
                        </p>
                        {isExpanded && (
                          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                            {station.address}
                            <span className="ml-2" style={{ color: '#4c6ef5' }}>Tap again for directions →</span>
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="shrink-0 text-right">
                        {fillCost ? (
                          <>
                            <p className="text-3xl font-bold leading-none" style={{ color: '#16a34a' }}>
                              {fillCost}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                              {price!.price}¢/litre
                            </p>
                            {fillSaving && parseFloat(fillSaving) > 0 && (
                              <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>+${fillSaving} vs cheapest</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-3xl font-bold leading-none" style={{ color: getPriceColor(price!.price) }}>
                              {price!.price}
                            </p>
                            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>¢/litre</p>
                            {saving && parseFloat(saving) > 0 && (
                              <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Save {saving}¢</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App