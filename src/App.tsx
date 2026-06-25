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
  { value: 'LPG', label: 'LPG' },
]

type SortMode = 'price' | 'distance'

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

  const getPrice = (stationCode: number) => {
    return data?.prices.find(p => p.stationcode === stationCode)
  }

  const avgPrice = data
    ? data.prices.reduce((sum, p) => sum + p.price, 0) / data.prices.length
    : null

  const getPriceColor = (price: number) => {
    if (!avgPrice) return 'text-white'
    if (price <= avgPrice - 3) return 'text-green-400'
    if (price >= avgPrice + 3) return 'text-red-400'
    return 'text-orange-400'
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
    <div className="min-h-screen" style={{ backgroundColor: '#0f1535', color: 'white' }}>

      {/* Row 1: Nav */}
      <div
        style={{ backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-4 py-3 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-3"
      >
        <h1 className="text-lg font-bold flex items-center shrink-0">
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
        </h1>

        <div className="flex gap-2 flex-1">
          <button
            onClick={handleUseLocation}
            disabled={locationLoading}
            className="shrink-0 text-sm font-semibold flex items-center gap-1.5 px-3 py-2 md:px-4"
            style={{ backgroundColor: '#4c6ef5', color: 'white' }}
          >
            📍 <span className="hidden sm:inline">{locationLoading ? 'Locating...' : 'Use my location'}</span>
            <span className="sm:hidden">{locationLoading ? '...' : 'My location'}</span>
          </button>

          <div
            className="flex-1 flex items-center gap-2 px-3 py-2"
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
              className="text-sm font-medium px-3 py-1 shrink-0"
              style={{ backgroundColor: '#4c6ef5', color: 'white' }}
            >
              Search
            </button>
          </div>
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

          {/* Search label */}
          {searchLabel && (
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              📍 Showing results near <span className="font-semibold" style={{ color: 'white' }}>{searchLabel}</span> within {RADIUS}km
            </p>
          )}

          {/* No results state */}
          {data.stations.length === 0 && (
            <div
              className="px-4 py-8 text-center"
              style={{ backgroundColor: '#1a2150' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                No stations found within {RADIUS}km of {searchLabel || 'this location'}.
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Try searching a nearby suburb.
              </p>
            </div>
          )}

          {data.stations.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs uppercase tracking-wider hidden sm:inline"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    Sort by
                  </span>
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

                  return (
                    <div
                      key={station.code}
                      className="flex items-center"
                      style={{
                        backgroundColor: '#1a2150',
                        borderLeft: index === 0 ? '3px solid #22c55e' : '3px solid transparent',
                        marginBottom: '2px',
                        padding: '12px 16px',
                      }}
                    >
                      {/* Price */}
                      <div className="shrink-0 mr-4 text-left w-20">
                        <p className={`text-3xl font-bold leading-none ${getPriceColor(price!.price)}`}>
                          {price!.price}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>¢/litre</p>
                        {saving && parseFloat(saving) > 0 && (
                          <p className="text-green-400 text-xs mt-1">Save {saving}¢</p>
                        )}
                      </div>

                      {/* Station info */}
                      <div className="flex-1 min-w-0">
                        {index === 0 && (
                          <p className="text-xs font-semibold mb-0.5 text-green-400">
                            {sortMode === 'price' ? 'CHEAPEST' : 'CLOSEST'}
                          </p>
                        )}
                        <h2 className="font-bold text-white text-sm leading-tight truncate">{station.name}</h2>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{station.address}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>📍 {station.location.distance.toFixed(1)} km away</p>
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