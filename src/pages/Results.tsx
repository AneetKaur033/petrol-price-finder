import { useState } from 'react'
import type { Station, Price, FuelData } from '../types'
import { GRADIENT_BG, FONT_FAMILY, RADIUS } from '../types'
import Nav from '../components/Nav'
import StationCard from '../components/StationCard'
import Calculator from '../components/Calculator'
import AlertModal from '../components/AlertModal'
import DirectionsModal from '../components/DirectionsModal'

interface ResultsProps {
  data: FuelData
  searchLabel: string | null
  fuelType: string
  activeFuel: string
  sortMode: 'price' | 'distance'
  onBack: () => void
  onFuelTypeChange: (fuel: string) => void
  onSortModeChange: (mode: 'price' | 'distance') => void
  getPrice: (stationCode: number) => Price | undefined
}

export default function Results({
  data,
  searchLabel,
  fuelType,
  activeFuel,
  sortMode,
  onBack,
  onFuelTypeChange,
  onSortModeChange,
  getPrice,
}: ResultsProps) {
  const [confirmStation, setConfirmStation] = useState<Station | null>(null)
  const [alertStation, setAlertStation] = useState<Station | null>(null)
  const [tankSize, setTankSize] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)

  const litresNeeded = tankSize && fuelLevel
    ? parseFloat(tankSize) * (1 - parseFloat(fuelLevel) / 100)
    : null

  function getFillCost(pricePerLitre: number): string | null {
    if (!litresNeeded) return null
    const cost = (pricePerLitre / 100) * litresNeeded
    return `$${cost.toFixed(2)}`
  }

  function openGoogleMaps(station: Station) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address)}`
    window.open(url, '_blank')
    setConfirmStation(null)
  }

  const avgPrice = (() => {
    const prices = data.prices.filter(p => p.fueltype === activeFuel)
    if (!prices.length) return null
    return prices.reduce((sum, p) => sum + p.price, 0) / prices.length
  })()

  const getSortedStations = () => {
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
    <div className="min-h-screen" style={{ background: GRADIENT_BG, fontFamily: FONT_FAMILY }}>

      {/* Modals */}
      {confirmStation && !alertStation && (
        <DirectionsModal
          station={confirmStation}
          onConfirm={() => openGoogleMaps(confirmStation)}
          onCancel={() => setConfirmStation(null)}
          onSetAlert={() => {
            setAlertStation(confirmStation)
            setConfirmStation(null)
          }}
        />
      )}

      {alertStation && (
        <AlertModal
          station={alertStation}
          activeFuel={activeFuel}
          onCancel={() => setAlertStation(null)}
        />
      )}

      {/* Nav */}
      <Nav
        showBack
        onBack={onBack}
        fuelType={fuelType}
        onFuelTypeChange={onFuelTypeChange}
      />

      {/* Results */}
      <div className="max-w-2xl mx-auto px-4 pb-10">

        {/* Header row */}
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
                onClick={() => onSortModeChange('price')}
                className="px-3 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: sortMode === 'price' ? '#1d4ed8' : 'transparent',
                  color: sortMode === 'price' ? 'white' : '#374151',
                }}
              >
                Price
              </button>
              <button
                onClick={() => onSortModeChange('distance')}
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

        {/* Calculator toggle */}
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="w-full mb-4 py-3 text-sm font-medium flex items-center justify-between px-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.9)', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <span>Use tank size and level to see exact fill cost</span>
          <span style={{ color: '#1d4ed8' }}>{showCalculator ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {/* Calculator */}
        {showCalculator && (
          <Calculator
            tankSize={tankSize}
            fuelLevel={fuelLevel}
            onTankSizeChange={setTankSize}
            onFuelLevelChange={setFuelLevel}
          />
        )}

        {/* No results */}
        {data.stations.length === 0 && (
          <div className="px-4 py-8 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px' }}>
            <p className="text-sm" style={{ color: '#64748b' }}>No stations found near {searchLabel || 'this location'}.</p>
            <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>Try searching a nearby suburb.</p>
          </div>
        )}

        {/* Station list */}
        <div className="space-y-3">
          {sortedStations.map(({ station, price }, index) => {
            const fillCost = getFillCost(price!.price)
            const cheapestFillCost = cheapestPrice && litresNeeded ? (cheapestPrice / 100) * litresNeeded : null
            const thisFillCost = litresNeeded ? (price!.price / 100) * litresNeeded : null
            const fillSaving = cheapestFillCost && thisFillCost && index > 0
              ? (thisFillCost - cheapestFillCost).toFixed(2)
              : null

            return (
            <StationCard
                key={station.code}
                station={station}
                price={price!}
                avgPrice={avgPrice}
                fillCost={fillCost}
                fillSaving={fillSaving}
                onClick={() => setConfirmStation(station)}
              />
            )
          })}
        </div>

        <p className="text-xs text-center mt-6" style={{ color: '#94a3b8' }}>
          {data.stations.length} stations · avg {avgPrice?.toFixed(1)}¢/L
        </p>
      </div>
    </div>
  )
}