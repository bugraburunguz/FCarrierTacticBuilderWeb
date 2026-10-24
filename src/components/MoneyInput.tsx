import { useState } from 'react'
import { formatEur } from '../lib/format'
import { parseMoney } from '../lib/parseMoney'
import { Input, Select } from './ui'

const UNITS = [
  { id: 'EUR', label: '€ tam', factor: 1 },
  { id: 'K', label: 'Bin €', factor: 1_000 },
  { id: 'M', label: 'Milyon €', factor: 1_000_000 },
] as const
type UnitId = (typeof UNITS)[number]['id']

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

const factorOf = (unit: UnitId) => UNITS.find((u) => u.id === unit)!.factor

/** Para girişi: tutar + birim (€ / Bin / Milyon) ve yazdıkça açık sonuç ("= €12,50 Mn"); değer her zaman tam euro olarak döner. */
export function MoneyInput({ value, onChange, onCommit, className = '', ariaLabel }: {
  value?: number
  /** `valid`: metin boş ya da geçerli tutar (geçersiz yazımda false; çağıran gönderimi engelleyebilir). */
  onChange: (euro: number | undefined, meta?: { valid: boolean }) => void
  onCommit?: (euro: number | undefined) => void
  className?: string
  ariaLabel?: string
}) {
  const [state, setState] = useState(() => initialUnit(value))
  const [seen, setSeen] = useState(value)
  const [focused, setFocused] = useState(false)
  const amount = parseMoney(state.text, factorOf(state.unit))

  // Dışarıdan gelen değer değişince (kayıt sonrası yenileme, başka sekme) odakta değilsek metni ona eşle; yazarken ezme.
  if (value !== seen) {
    setSeen(value)
    if (!focused && value !== amount) {
      setState(initialUnit(value))
    }
  }

  const invalid = amount === undefined && state.text.trim() !== ''

  function update(next: { unit: UnitId; text: string }) {
    setState(next)
    const parsed = parseMoney(next.text, factorOf(next.unit))
    onChange(parsed, { valid: parsed !== undefined || next.text.trim() === '' })
  }

  return (
    <div className={className}>
      <div className="flex gap-1.5">
        <Input className="min-w-0 flex-1" type="text" inputMode="decimal" aria-label={ariaLabel ?? 'Tutar'} value={state.text} placeholder="Örn. 2,5" onChange={(e) => update({ ...state, text: e.target.value })} onFocus={() => setFocused(true)} onBlur={() => {
          setFocused(false)
          // REVIEW O1: geçersiz yazımla çıkınca kayıtlı değer silinmez (boş bırakmak ise bilinçli silmedir).
          if (!invalid) {
            onCommit?.(amount)
          }
        }} />
        <Select aria-label="Birim" value={state.unit} className="!w-28 shrink-0" onChange={(e) => update({ ...state, unit: e.target.value as UnitId })}>
          {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </Select>
      </div>
      <p className="mt-1 text-xs text-muted" aria-live="polite">{amount === undefined ? (state.text.trim() === '' ? 'Boş' : 'Geçersiz tutar') : `= ${formatEur(amount)}`}</p>
    </div>
  )
}
