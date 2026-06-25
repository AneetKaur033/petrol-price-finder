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
    if (!avgPrice) return 'text-gray-900'
    if (price <= avgPrice - 3) return 'text-green-600'
    if (price >= avgPrice + 3) return 'text-red-500'
    return 'text-orange-500'
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
    <div className="min-h-screen bg-gray-50">

      {/* Top Nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">
          fuel<span className="text-blue-500">finder</span>
        </h1>
        <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter suburb or postcode e.g. Bondi, 2026"
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
          <button onClick={handleSearch} disabled={loading}>
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <button
          onClick={handleUseLocation}
          disabled={locationLoading}
          className="flex items-center gap-1.5 text-sm text-blue-500 font-medium"
        >
          <span>📍</span>
          {locationLoading ? 'Locating...' : 'My location'}
        </button>

        <div className="w-px h-4 bg-gray-200" />

        <select
          value={fuelType}
          onChange={e => setFuelType(e.target.value)}
          className="text-sm text-gray-600 bg-transparent focus:outline-none"
        >
          {FUEL_TYPES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Finding cheapest prices...</div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">⛽</p>
          <p className="text-sm">Search a suburb or use your location to find cheap fuel nearby</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="max-w-2xl mx-auto px-4 mt-6 pb-10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-400">
              {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
            </p>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSortMode('price')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  sortMode === 'price' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                Price
              </button>
              <button
                onClick={() => setSortMode('distance')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  sortMode === 'distance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                }`}
              >
                Distance
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {getSortedStations().map(({ station, price }, index) => {
              const saving = avgPrice ? (avgPrice - price!.price).toFixed(1) : null

              return (
                <div key={station.code} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {index === 0 && sortMode === 'price' && (
                          <span className="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded-full font-medium border border-green-100">
                            Cheapest
                          </span>
                        )}
                        {index === 0 && sortMode === 'distance' && (
                          <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-100">
                            Closest
                          </span>
                        )}
                      </div>
                      <h2 className="font-semibold text-gray-900">{station.name}</h2>
                      <p className="text-gray-400 text-sm mt-0.5">{station.address}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        📍 {station.location.distance.toFixed(1)} km away
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${getPriceColor(price!.price)}`}>
                        {price!.price}
                      </p>
                      <p className="text-gray-400 text-xs">¢/litre</p>
                      {saving && parseFloat(saving) > 0 && (
                        <p className="text-green-500 text-xs mt-1">
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