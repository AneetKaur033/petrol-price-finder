interface CalculatorProps {
  tankSize: string
  fuelLevel: string
  onTankSizeChange: (value: string) => void
  onFuelLevelChange: (value: string) => void
}

export default function Calculator({ tankSize, fuelLevel, onTankSizeChange, onFuelLevelChange }: CalculatorProps) {
  const litresNeeded = tankSize && fuelLevel
    ? parseFloat(tankSize) * (1 - parseFloat(fuelLevel) / 100)
    : null

  return (
    <div className="mb-4 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Tank size (litres)</label>
          <input
            type="number"
            value={tankSize}
            onChange={e => {
              const val = parseFloat(e.target.value)
              if (e.target.value === '' || val > 0) onTankSizeChange(e.target.value)
            }}
            placeholder="e.g. 50"
            min="1"
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#0f172a' }}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Current level (%)</label>
          <input
            type="number"
            value={fuelLevel}
            onChange={e => {
              const val = parseFloat(e.target.value)
              if (e.target.value === '' || (val >= 0 && val <= 100)) onFuelLevelChange(e.target.value)
            }}
            placeholder="e.g. 25"
            min="0"
            max="100"
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#0f172a' }}
          />
        </div>
      </div>
      {litresNeeded && (
        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          You need <span className="font-semibold" style={{ color: '#0f172a' }}>{litresNeeded.toFixed(1)}L</span> to fill up
        </p>
      )}
    </div>
  )
}