import type { Station } from '../types'

interface DirectionsModalProps {
  station: Station
  onConfirm: () => void
  onCancel: () => void
  onSetAlert: () => void
}

export default function DirectionsModal({ station, onConfirm, onCancel, onSetAlert }: DirectionsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="font-bold text-base mb-1" style={{ color: '#0f172a' }}>{station.name}</p>
        <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>{station.address}</p>
        <div className="space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
          >
            Get directions
          </button>
          <button
            onClick={onSetAlert}
            className="w-full py-3 text-sm font-semibold"
            style={{ backgroundColor: '#f0f4ff', color: '#1d4ed8', borderRadius: '8px' }}
          >
            Set price alert
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 text-sm font-medium"
            style={{ border: '1px solid #e2e8f0', color: '#374151', borderRadius: '8px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}