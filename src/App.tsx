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
  const [staleResults, setStaleResults] = useState(false)

  const RADIUS = 3

  async function fetchByCoords(lat: number, lng: number, fuel: string = fuelType) {
    setLoading(true)
    setError(null)
    setStaleResults(false)
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
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ', NSW, Australia')}&format=json&limit=1`
      )
      const geoData = await geoRes.json()
      if (!geoData.length) throw new Error('Suburb or postcode not found')
      const { lat, lon } = geoData[0]
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
        await fetchByCoords(pos.coords.latitude, pos.coords.longitude, fuelType)
        setLocationLoading(false)
      },
      () => {
        setError('Location access denied. Please enter a suburb instead.')
        setLocationLoading(false)
      }
    )
  }

  function handleFuelTypeChange(newFuel: string) {
    setFuelType(newFuel)
    if (data && lastSearchCoords) {
      setStaleResults(true)
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
      return withPrices.sort((a, b) => a.price!.price - b.price!.price).slice(0, 8)
    } else {
      return withPrices.sort((a, b) => a.station.location.distance - b.station.location.distance).slice(0, 8)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1535', color: 'white' }}>

      {/* Row 1: Nav */}
      <div style={{ backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-6 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold shrink-0">
          fuel<span style={{ color: '#4c6ef5' }}>finder</span>
        </h1>

        <button
          onClick={handleUseLocation}
          disabled={locationLoading}
          className="shrink-0 text-sm font-semibold flex items-center gap-1.5 px-4 py-2"
          style={{ backgroundColor: '#4c6ef5', color: 'white' }}
        >
          📍 {locationLoading ? 'Locating...' : 'Use my location'}
        </button>

        <div className="flex-1 flex items-center gap-2 px-3 py-2"
          style={{ backgroundColor: '#1a2150', border: '1px solid rgba(255,255,255,0.1)' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Or enter suburb / postcode"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-sm font-medium px-3 py-1"
            style={{ backgroundColor: '#4c6ef5', color: 'white' }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Row 2: Fuel type */}
      <div style={{ backgroundColor: '#0a0f2c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        className="px-6 py-2 flex items-center gap-2">
        {FUEL_TYPES.map(f => (
          <button
            key={f.value}
            onClick={() => handleFuelTypeChange(f.value)}
            className="text-sm px-3 py-1 font-medium"
            style={{
              backgroundColor: fuelType === f.value ? '#4c6ef5' : 'transparent',
              color: fuelType === f.value ? 'white' : 'rgba(255,255,255,0.4)',
              border: fuelType === f.value ? '1px solid #4c6ef5' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stale results warning */}
      {staleResults && data && lastSearchCoords && (
        <div className="px-6 py-2 flex items-center justify-between text-sm"
          style={{ backgroundColor: 'rgba(76,110,245,0.15)', borderBottom: '1px solid rgba(76,110,245,0.3)' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Fuel type changed — results are for previous selection</span>
          <button
            onClick={() => fetchByCoords(lastSearchCoords.lat, lastSearchCoords.lng, fuelType)}
            className="font-semibold"
            style={{ color: '#4c6ef5' }}
          >
            Update results →
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 text-sm text-red-300"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-white/40 text-sm">Finding cheapest prices...</div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-24 text-white/30">
          <p className="text-4xl mb-3">⛽</p>
          <p className="text-sm">Use your location or search a suburb to find cheap fuel nearby</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="px-6 mt-5 pb-10">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-white/40">
              {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
            </p>
            <div className="flex" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setSortMode('price')}
                className="px-4 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: sortMode === 'price' ? '#4c6ef5' : 'transparent',
                  color: sortMode === 'price' ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              >
                Price
              </button>
              <button
                onClick={() => setSortMode('distance')}
                className="px-4 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: sortMode === 'distance' ? '#4c6ef5' : 'transparent',
                  color: sortMode === 'distance' ? 'white' : 'rgba(255,255,255,0.4)',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Distance
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {getSortedStations().map(({ station, price }, index) => {
              const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null

              return (
                <div
                  key={station.code}
                  className="p-4 flex justify-between items-center"
                  style={{
                    backgroundColor: '#1a2150',
                    borderLeft: index === 0 && sortMode === 'price'
                      ? '3px solid #22c55e'
                      : index === 0 && sortMode === 'distance'
                      ? '3px solid #4c6ef5'
                      : '3px solid transparent',
                    marginBottom: '2px'
                  }}
                >
                  <div className="flex-1 pr-6">
                    {index === 0 && (
                      <p className="text-xs font-semibold mb-1"
                        style={{ color: sortMode === 'price' ? '#22c55e' : '#4c6ef5' }}>
                        {sortMode === 'price' ? 'CHEAPEST' : 'CLOSEST'}
                      </p>
                    )}
                    <h2 className="font-bold text-white text-base leading-tight">{station.name}</h2>
                    <p className="text-white/40 text-xs mt-1">{station.address}</p>
                    <p className="text-white/30 text-xs mt-1">📍 {station.location.distance.toFixed(1)} km away</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-4xl font-bold leading-none ${getPriceColor(price!.price)}`}>
                      {price!.price}
                    </p>
                    <p className="text-white/40 text-sm mt-1">¢/litre</p>
                    {saving && parseFloat(saving) > 0 && (
                      <p className="text-green-400 text-xs mt-1">Save {saving}¢</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default App