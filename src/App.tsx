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

  const RADIUS = 3

  async function fetchByCoords(lat: number, lng: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/fuel?lat=${lat}&lng=${lng}&radius=${RADIUS}&fueltype=${fuelType}`)
      const json = await res.json()
      if (json.errorDetails) throw new Error(json.errorDetails.message)
      setData(json)
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
      await fetchByCoords(parseFloat(lat), parseFloat(lon))
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
        await fetchByCoords(pos.coords.latitude, pos.coords.longitude)
        setLocationLoading(false)
      },
      () => {
        setError('Location access denied. Please enter a suburb instead.')
        setLocationLoading(false)
      }
    )
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
    <div className="min-h-screen" style={{ backgroundColor: '#0f1535' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0f1535' }} className="px-6 py-5 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white">⛽ Petrol Finder NSW</h1>
        <p className="text-blue-300 text-sm mt-1">Find the cheapest fuel near you</p>
      </div>

      {/* Search Section */}
      <div className="px-6 py-6">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter suburb or postcode e.g. Bondi, 2026"
            className="flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: '#1a2150' }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#4c6ef5' }}
          >
            Search
          </button>
        </div>

        <button
          onClick={handleUseLocation}
          disabled={locationLoading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white mb-4 border border-white/20"
          style={{ backgroundColor: '#1a2150' }}
        >
          {locationLoading ? 'Getting location...' : '📍 Use my current location'}
        </button>

        <select
          value={fuelType}
          onChange={e => setFuelType(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
          style={{ backgroundColor: '#1a2150' }}
        >
          {FUEL_TYPES.map(f => (
            <option key={f.value} value={f.value} style={{ backgroundColor: '#1a2150' }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-10 text-blue-300">Finding cheapest prices...</div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="px-6 pb-10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-blue-300">
              {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
            </p>

            {/* Toggle */}
            <div className="flex rounded-xl p-1" style={{ backgroundColor: '#1a2150' }}>
              <button
                onClick={() => setSortMode('price')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortMode === 'price'
                    ? 'text-white'
                    : 'text-white/40'
                }`}
                style={sortMode === 'price' ? { backgroundColor: '#4c6ef5' } : {}}
              >
                Price
              </button>
              <button
                onClick={() => setSortMode('distance')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sortMode === 'distance'
                    ? 'text-white'
                    : 'text-white/40'
                }`}
                style={sortMode === 'distance' ? { backgroundColor: '#4c6ef5' } : {}}
              >
                Distance
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {getSortedStations().map(({ station, price }, index) => {
              const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null

              return (
                <div
                  key={station.code}
                  className="rounded-2xl p-4 border border-white/10"
                  style={{ backgroundColor: '#1a2150' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {index === 0 && sortMode === 'price' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-green-400 border border-green-400/40">
                            Cheapest
                          </span>
                        )}
                        {index === 0 && sortMode === 'distance' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-blue-400 border border-blue-400/40">
                            Closest
                          </span>
                        )}
                      </div>
                      <h2 className="font-semibold text-white">{station.name}</h2>
                      <p className="text-white/40 text-sm mt-0.5">{station.address}</p>
                      <p className="text-white/40 text-sm mt-1">
                        📍 {station.location.distance.toFixed(1)} km away
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${getPriceColor(price!.price)}`}>
                        {price!.price}
                      </p>
                      <p className="text-white/40 text-xs">¢/litre</p>
                      {saving && parseFloat(saving) > 0 && (
                        <p className="text-green-400 text-xs mt-1">
                          Save {saving}¢/L
                        </p>
                      )}
                    </div>
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