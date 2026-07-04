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

  const RADIUS = 3

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
    if (!avgPrice) return '#111827'
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', color: '#111827' }}>

      {/* Google Maps Confirmation Modal */}
      {confirmStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmStation(null)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="font-bold text-base mb-1" style={{ color: '#111827' }}>Open in Google Maps?</p>
            <p className="text-sm mb-1" style={{ color: '#6b7280' }}>
              {confirmStation.name}
            </p>
            <p className="text-xs mb-5" style={{ color: '#9ca3af' }}>
              {confirmStation.address}
            </p>
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

      {/* Row 1: Nav */}
      <div
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        className="px-4 py-3 flex items-center gap-3"
      >
        <h1 className="text-lg font-bold shrink-0" style={{ color: '#111827' }}>
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
        </h1>

        {/* GPS icon button */}
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
          style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
        >
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Suburb or postcode"
            className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
            style={{ color: '#111827' }}
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
        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
        className="px-4 py-2 flex items-center gap-2 overflow-x-auto"
      >
        {FUEL_TYPES.map(f => (
          <button
            key={f.value}
            onClick={() => handleFuelTypeChange(f.value)}
            className="text-sm px-3 py-1 font-medium shrink-0"
            style={{
              backgroundColor: fuelType === f.value ? '#4c6ef5' : 'transparent',
              color: fuelType === f.value ? 'white' : '#374151',
              border: fuelType === f.value ? '1px solid #4c6ef5' : '1px solid #d1d5db',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-4 mt-4 px-4 py-3 text-sm"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-sm" style={{ color: '#6b7280' }}>
          Finding cheapest prices...
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-24 px-4" style={{ color: '#9ca3af' }}>
          <p className="text-4xl mb-3">⛽</p>
          <p className="text-sm">Use your location or search a suburb to find cheap fuel nearby</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="px-4 mt-5 pb-10">

          {searchLabel && (
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
              Showing results near <span className="font-semibold" style={{ color: '#111827' }}>{searchLabel}</span> within {RADIUS}km
            </p>
          )}

          {data.stations.length === 0 && (
            <div className="px-4 py-8 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                No stations found within {RADIUS}km of {searchLabel || 'this location'}.
              </p>
              <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                Try searching a nearby suburb.
              </p>
            </div>
          )}

          {data.stations.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider" style={{ color: '#6b7280' }}>
                    Sort by
                  </span>
                  <div className="flex" style={{ border: '1px solid #d1d5db' }}>
                    <button
                      onClick={() => setSortMode('price')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'price' ? '#4c6ef5' : 'transparent',
                        color: sortMode === 'price' ? 'white' : '#374151',
                      }}
                    >
                      Price
                    </button>
                    <button
                      onClick={() => setSortMode('distance')}
                      className="px-3 py-1.5 text-sm font-medium"
                      style={{
                        backgroundColor: sortMode === 'distance' ? '#4c6ef5' : 'transparent',
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

              <div className="space-y-1">
                {getSortedStations().map(({ station, price }, index) => {
                  const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null
                  const membersOnly = isMembersOnly(station.name)
                  const isExpanded = expandedStation === index

                  return (
                    <div
                      key={station.code}
                      onClick={() => handleCardClick(station, index)}
                      className="flex items-center cursor-pointer"
                      style={{
                        backgroundColor: isExpanded ? '#f0f4ff' : '#ffffff',
                        borderLeft: index === 0 ? '3px solid #16a34a' : '3px solid transparent',
                        border: '1px solid #e5e7eb',
                        borderLeftWidth: index === 0 ? '3px' : '1px',
                        borderLeftColor: index === 0 ? '#16a34a' : '#e5e7eb',
                        marginBottom: '4px',
                        padding: '12px 16px',
                        transition: 'background-color 0.15s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0f4ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? '#f0f4ff' : '#ffffff')}
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
                        <h2 className="font-bold text-sm leading-tight" style={{ color: '#111827' }}>
                          {station.name}
                        </h2>
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
                        <p className="text-3xl font-bold leading-none" style={{ color: getPriceColor(price!.price) }}>
                          {price!.price}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>¢/litre</p>
                        {saving && parseFloat(saving) > 0 && (
                          <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Save {saving}¢</p>
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