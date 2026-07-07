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
  { value: 'E10', label: 'E10' },
  { value: 'U91', label: 'U91' },
  { value: 'P95', label: 'P95' },
  { value: 'P98', label: 'P98' },
  { value: 'DL', label: 'Diesel' },
  { value: 'PDL', label: 'Premium Diesel' },
  { value: 'E85', label: 'E85' },
  { value: 'B20', label: 'B20' },
  { value: 'EV', label: 'EV Charge' },
  { value: 'LPG', label: 'LPG' },
  { value: 'LNG', label: 'LNG' },
  { value: 'H2', label: 'Hydrogen' },
  { value: 'CNG', label: 'CNG' },
]

type SortMode = 'price' | 'distance'

const MEMBERS_ONLY_KEYWORDS = ['costco', 'members only', 'members-only']

function isMembersOnly(name: string) {
  return MEMBERS_ONLY_KEYWORDS.some(k => name.toLowerCase().includes(k))
}

function App() {
  const [search, setSearch] = useState('')
  const [fuelType, setFuelType] = useState('E10')
  const [data, setData] = useState<FuelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('price')
  const [lastSearchCoords, setLastSearchCoords] = useState<{lat: number, lng: number} | null>(null)
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
    if (!avgPrice) return '#ffffff'
    if (price <= avgPrice - 3) return '#4ade80'
    if (price >= avgPrice + 3) return '#f87171'
    return '#fb923c'
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1535', color: 'white' }}>

      {/* Google Maps Confirmation Modal */}
      {confirmStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => setConfirmStation(null)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ backgroundColor: '#1a2150', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-base mb-1 text-white">Open in Google Maps?</p>
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{confirmStation.name}</p>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>{confirmStation.address}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStation(null)}
                className="flex-1 py-2 text-sm font-medium"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
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

      {/* Row 1: Nav */}
      <div
        style={{ backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-4 py-3 flex items-center gap-3"
      >
        <h1 className="text-lg font-bold shrink-0">
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
        </h1>

        <button
          onClick={handleUseLocation}
          disabled={locationLoading}
          className="shrink-0 flex items-center justify-center w-10 h-10"
          style={{ backgroundColor: '#4c6ef5', color: 'white' }}
          title="Use my location"
        >
          {locationLoading ? (
            <span className="text-xs">...</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
              <circle cx="12" cy="12" r="7"/>
            </svg>
          )}
        </button>

        <div
          className="flex-1 flex items-center gap-2 px-3 h-10"
          style={{ backgroundColor: '#1a2150', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Suburb or postcode"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/60 focus:outline-none min-w-0"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-sm font-medium px-3 py-1 shrink-0 text-white"
            style={{ backgroundColor: '#4c6ef5' }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Row 2: Fuel type */}
      <div
        style={{ backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-4 py-2 flex items-center gap-2 overflow-x-auto"
      >
        {FUEL_TYPES.map(f => (
          <button
            key={f.value}
            onClick={() => handleFuelTypeChange(f.value)}
            className="text-sm px-3 py-1 font-medium shrink-0"
            style={{
              backgroundColor: fuelType === f.value ? '#4c6ef5' : 'transparent',
              color: fuelType === f.value ? 'white' : 'rgba(255,255,255,0.85)',
              border: fuelType === f.value ? '1px solid #4c6ef5' : '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-4 mt-4 px-4 py-3 text-sm text-red-300"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-white/60 text-sm">Finding cheapest prices...</div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-24 px-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <p className="text-4xl mb-3">⛽</p>
          <p className="text-sm">Use your location or search a suburb to find cheap fuel nearby</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="px-4 mt-5 pb-10">

          {searchLabel && (
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Showing results near <span className="font-semibold text-white">{searchLabel}</span> within {RADIUS}km
            </p>
          )}

          {/* Fill Cost Calculator */}
          <div
            className="mb-4 p-4"
            style={{ backgroundColor: '#1a2150', border: '1px solid rgba(255,255,255,0.08)' }}
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
                  style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#0f1535' }}
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
                  style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#0f1535' }}
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
            <div className="px-4 py-8 text-center" style={{ backgroundColor: '#1a2150' }}>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                No stations found within {RADIUS}km of {searchLabel || 'this location'}.
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Try searching a nearby suburb.</p>
            </div>
          )}

          {data.stations.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Sort by</span>
                  <div className="flex" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                    <button
                      onClick={() => setSortMode('price')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'price' ? '#4c6ef5' : 'transparent',
                        color: sortMode === 'price' ? 'white' : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Price
                    </button>
                    <button
                      onClick={() => setSortMode('distance')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'distance' ? '#4c6ef5' : 'transparent',
                        color: sortMode === 'distance' ? 'white' : 'rgba(255,255,255,0.85)',
                        borderLeft: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      Distance
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
                </p>
              </div>

              <div className="space-y-1">
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
                        backgroundColor: isExpanded ? '#1e2a6a' : '#1a2150',
                        borderLeft: index === 0 ? '3px solid #4ade80' : '3px solid transparent',
                        marginBottom: '2px',
                        padding: '12px 16px',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e2a6a')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? '#1e2a6a' : '#1a2150')}
                    >
                      {/* Rank */}
                      <div
                        className="shrink-0 mr-4 text-center w-5"
                        style={{ color: index === 0 ? '#4ade80' : 'rgba(255,255,255,0.3)' }}
                      >
                        <p className="text-sm font-bold">{index + 1}</p>
                      </div>

                      {/* Station info */}
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {index === 0 && (
                            <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                              {sortMode === 'price' ? 'CHEAPEST' : 'CLOSEST'}
                            </span>
                          )}
                          {membersOnly && (
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5"
                              style={{ backgroundColor: 'rgba(234,179,8,0.2)', color: '#facc15', border: '1px solid rgba(234,179,8,0.4)' }}
                            >
                              MEMBERS ONLY
                            </span>
                          )}
                        </div>
                        <h2 className="font-bold text-sm leading-tight text-white">{station.name}</h2>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {station.location.distance.toFixed(1)} km away
                        </p>
                        {isExpanded && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {station.address}
                            <span className="ml-2" style={{ color: '#4c6ef5' }}>Tap again for directions →</span>
                          </p>
                        )}
                      </div>

                      {/* Price + fill cost */}
                      <div className="shrink-0 text-right">
                        {fillCost ? (
                          <>
                            <p className="text-3xl font-bold leading-none" style={{ color: '#4ade80' }}>
                              {fillCost}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                              {price!.price}¢/litre
                            </p>
                            {fillSaving && parseFloat(fillSaving) > 0 && (
                              <p className="text-xs mt-0.5" style={{ color: '#f87171' }}>+${fillSaving} vs cheapest</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-3xl font-bold leading-none" style={{ color: getPriceColor(price!.price) }}>
                              {price!.price}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>¢/litre</p>
                            {saving && parseFloat(saving) > 0 && (
                              <p className="text-xs mt-1" style={{ color: '#4ade80' }}>Save {saving}¢</p>
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