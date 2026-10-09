import { useState } from 'react'
import { formatEur } from '../lib/format'
import { Input, Select } from './ui'

const UNITS = [
  { id: 'EUR', label: '€ (tam tutar)', factor: 1 },
  { id: 'K', label: 'Bin €', factor: 1_000 },
  { id: 'M', label: 'Milyon €', factor: 1_000_000 },
] as const
type UnitId = (typeof UNITS)[number]['id']

function toAmount(text: string, factor: number): number | undefined {
  const parsed = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(parsed) || parsed < 0 ? undefined : Math.round(parsed * factor)
}

function initialUnit(value?: number): { unit: UnitId; text: string } {
  if (value === undefined || value === 0) {
    return { unit: 'M', text: value === 0 ? '0' : '' }
  }
  if (value % 1_000_000 === 0) {
    return { unit: 'M', text: String(value / 1_000_000) }
  }
  if (value % 1_000 === 0) {
    return { unit: 'K', text: String(value / 1_000) }
  }
  return { unit: 'EUR', text: String(value) }
}

/** Para girişi: tutar + birim (€ / Bin / Milyon) ve yazdıkça açık sonuç ("= €12,50 Mn"); değer her zaman tam euro olarak döner. */
export function MoneyInput({ value, onChange, onCommit, className = '', ariaLabel }: { value?: number; onChange: (euro: number | undefined) => void; onCommit?: (euro: number | undefined) => void; className?: string; ariaLabel?: string }) {
  const [state, setState] = useState(() => initialUnit(value))
  const factor = UNITS.find((u) => u.id === state.unit)!.factor
  const amount = toAmount(state.text, factor)

  function update(next: { unit: UnitId; text: string }) {
    setState(next)
    onChange(toAmount(next.text, UNITS.find((u) => u.id === next.unit)!.factor))
  }

  return (
    <div className={className}>
      <div className="flex gap-1.5">
        <Input type="text" inputMode="decimal" aria-label={ariaLabel ?? 'Tutar'} value={state.text} placeholder="0" onChange={(e) => update({ ...state, text: e.target.value })} onBlur={() => onCommit?.(amount)} />
        <Select aria-label="Birim" value={state.unit} className="w-auto shrink-0" onChange={(e) => { const unit = e.target.value as UnitId; update({ ...state, unit }); onCommit?.(toAmount(state.text, UNITS.find((u) => u.id === unit)!.factor)) }}>
          {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
      </div>
      <p className="mt-1 text-xs text-muted" aria-live="polite">{amount === undefined ? (state.text.trim() === '' ? 'Boş' : 'Geçersiz tutar') : `= ${formatEur(amount)}`}</p>
    </div>
  )
}
