import { useState } from 'react'
import type { Station } from '../types'

interface AlertModalProps {
  station: Station
  activeFuel: string
  onCancel: () => void
}

export default function AlertModal({ station, activeFuel, onCancel }: AlertModalProps) {
  const [alertEmail, setAlertEmail] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertSuccess, setAlertSuccess] = useState(false)

  async function handleSetAlert() {
    if (!alertEmail || !alertThreshold) return
    setAlertSaving(true)
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertEmail,
          station_code: station.code,
          station_name: station.name,
          station_address: station.address,
          fuel_type: activeFuel,
          threshold_price: parseFloat(alertThreshold),
        }),
      })
      if (!res.ok) throw new Error('Failed to save alert')
      setAlertSuccess(true)
    } catch (e) {
      alert('Failed to save alert. Please try again.')
    } finally {
      setAlertSaving(false)
    }
  }

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
        {alertSuccess ? (
          <>
            <p className="font-bold text-base mb-2" style={{ color: '#16a34a' }}>Alert set!</p>
            <p className="text-sm mb-4" style={{ color: '#64748b' }}>
              We'll email you when {station.name} drops below {alertThreshold}¢/L.
            </p>
            <button
              onClick={onCancel}
              className="w-full py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: '#1d4ed8', borderRadius: '8px' }}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="font-bold text-base mb-1" style={{ color: '#0f172a' }}>Set price alert</p>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>
              Get an email when <strong>{station.name}</strong> drops below your price.
            </p>

            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Your email</label>
            <input
              type="email"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 text-sm mb-3 focus:outline-none"
              style={{ border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
            />

            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Alert me when price drops below (¢/L)</label>
            <input
              type="number"
              value={alertThreshold}
              onChange={e => setAlertThreshold(e.target.value)}
              placeholder="e.g. 160"
              className="w-full px-4 py-3 text-sm mb-5 focus:outline-none"
              style={{ border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
            />

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 text-sm font-medium"
                style={{ border: '1px solid #e2e8f0', color: '#374151', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetAlert}
                disabled={alertSaving || !alertEmail || !alertThreshold}
                className="flex-1 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: '#1d4ed8', borderRadius: '8px', opacity: (!alertEmail || !alertThreshold) ? 0.5 : 1 }}
              >
                {alertSaving ? 'Saving...' : 'Set alert'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}