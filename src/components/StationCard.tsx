import type { Station, Price } from '../types'
import { isMembersOnly } from '../types'

interface StationCardProps {
  station: Station
  price: Price
  index: number
  avgPrice: number | null
  sortMode: 'price' | 'distance'
  fillCost: string | null
  fillSaving: string | null
  onClick: () => void
}

export default function StationCard({
  station,
  price,
  index,
  avgPrice,
  sortMode,
  fillCost,
  fillSaving,
  onClick,
}: StationCardProps) {
  const membersOnly = isMembersOnly(station.name)

  const saving = avgPrice ? (avgPrice - price.price).toFixed(1) : null

  const getPriceColor = () => {
    if (!avgPrice) return '#0f172a'
    if (price.price <= avgPrice - 3) return '#16a34a'
    if (price.price >= avgPrice + 3) return '#dc2626'
    return '#ea580c'
  }

  return (
    <div
      onClick={onClick}
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
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{price.price}¢/litre</p>
              {fillSaving && parseFloat(fillSaving) > 0 && (
                <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>+${fillSaving} vs cheapest</p>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl font-bold leading-none" style={{ color: getPriceColor() }}>{price.price}</p>
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
}