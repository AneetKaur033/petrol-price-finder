import { useState } from 'react'
import type { FuelData, Price } from './types'
import Landing from './pages/Landing'
import Results from './pages/Results'

type Page = 'landing' | 'results'

const RADIUS = 3

export default function App() {
  const [page, setPage] = useState<Page>('landing')
  const [search, setSearch] = useState('')
  const [fuelType, setFuelType] = useState('E10')
  const [activeFuel, setActiveFuel] = useState('E10')
  const [data, setData] = useState<FuelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [sortMode, setSortMode] = useState<'price' | 'distance'>('price')
  const [lastSearchCoords, setLastSearchCoords] = useState<{ lat: number, lng: number } | null>(null)
  const [searchLabel, setSearchLabel] = useState<string | null>(null)

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

  function getPrice(stationCode: number): Price | undefined {
    return data?.prices.find(p => p.stationcode === stationCode && p.fueltype === activeFuel)
  }

  if (page === 'landing') {
    return (
      <Landing
        search={search}
        fuelType={fuelType}
        loading={loading}
        locationLoading={locationLoading}
        error={error}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        onUseLocation={handleUseLocation}
        onFuelTypeChange={setFuelType}
      />
    )
  }

  return (
    <Results
      data={data!}
      searchLabel={searchLabel}
      fuelType={fuelType}
      activeFuel={activeFuel}
      sortMode={sortMode}
      onBack={() => setPage('landing')}
      onFuelTypeChange={handleFuelTypeChange}
      onSortModeChange={setSortMode}
      getPrice={getPrice}
    />
  )
}