import { useId } from 'react'
import type { ShortlistItem } from '../../api/types'
import { MoneyInput } from '../../components/MoneyInput'
import { Button, OvrBox } from '../../design/components/primitives'
import { formatEur } from '../../lib/format'
import { FILTER_PARAMS, type TransferFilters } from './transferFilters'

const INPUT = 'min-h-10 w-full rounded-[var(--radius-sm)] border border-line bg-[var(--bg-base)] px-3 text-sm tabular-nums text-ink max-sm:min-h-11'

/**
 * FCA-4 Ayrıntılı filtre (Stitch sol panel): en düşük OVR / POT, en yüksek değer. Adrese yazar; öneri sonucunu tarayıcıda süzer
 * (yeni istek ve kredi yok). Mevki, rol, yaş ve bütçe aday panelindeki istek filtreleridir.
 */
export function FilterPanel({ filters, onChange }: { filters: TransferFilters; onChange: (next: Record<string, string | undefined>) => void }) {
  const ids = { ovr: useId(), pot: useId() }
  const num = (v: string) => (v === '' ? undefined : v)
  return (
    <section aria-label="Ayrıntılı filtre" className="glass-2 flex flex-col gap-3 p-3 sm:p-4">
      <h2 className="panel-title font-display text-xl font-semibold leading-6">Ayrıntılı filtre</h2>
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={ids.ovr} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          En düşük OVR
          <input id={ids.ovr} type="number" inputMode="numeric" min={1} max={99} className={INPUT}
            value={filters.minOvr ?? ''} onChange={(e) => onChange({ [FILTER_PARAMS.minOvr]: num(e.target.value) })} />
        </label>
        <label htmlFor={ids.pot} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          En düşük POT
          <input id={ids.pot} type="number" inputMode="numeric" min={1} max={99} className={INPUT}
            value={filters.minPot ?? ''} onChange={(e) => onChange({ [FILTER_PARAMS.minPot]: num(e.target.value) })} />
        </label>
      </div>
      <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
        En yüksek değer
        {/* Yazınca ve birim değişince hemen uygulanır (yalnız süzgeç, istek yok); geçersiz yazım adresi değiştirmez. */}
        <MoneyInput ariaLabel="En yüksek değer" value={filters.maxValue}
          onChange={(v, meta) => meta?.valid !== false && onChange({ [FILTER_PARAMS.maxValue]: v === undefined ? undefined : String(v) })} />
      </div>
      <p className="text-xs text-ink-2">Gelen adayları süzer; yeni istek atılmaz, kredi düşmez.</p>
      <Button variant="ghost" onClick={() => onChange({ [FILTER_PARAMS.minOvr]: undefined, [FILTER_PARAMS.minPot]: undefined, [FILTER_PARAMS.maxValue]: undefined })}>Sıfırla</Button>
    </section>
  )
}

/** FCA-4 Kısa liste özeti (Stitch sağ sütun): ad, mevki, OVR kutusu, pazarlık tavanı (yoksa değer); ayrıntı ve düzenleme Kısa liste sekmesinde. */
export function ShortlistSummary({ items, onOpen }: { items: ShortlistItem[]; onOpen: () => void }) {
  return (
    <section aria-label="Kısa liste" className="glass-2 flex flex-col gap-3 p-3 sm:p-4">
      <h2 className="panel-title font-display text-xl font-semibold leading-6">Kısa liste · {items.length}</h2>
      {items.length === 0 ? <p className="text-sm text-ink-2">Adaylardan kısa listeye ekle.</p> : (
        <ul aria-label="Kısa liste özeti" className="flex flex-col gap-2">
          {items.map((s) => {
            const price = s.maxFeeEur ?? s.player?.valueEur
            return (
              <li key={s.playerId} className="glass-3 flex items-center gap-3 p-2.5 text-sm">
                <OvrBox value={s.player?.overall} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate">{s.player?.name ?? `Oyuncu ${s.playerId}`}</b>
                  <span className="truncate text-xs text-ink-2">{s.player?.positions?.[0] ?? '—'}{s.note ? ` · ${s.note}` : ''}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {price !== undefined && price !== null ? formatEur(price) : '—'}
                  <span className="block text-xs text-muted">{s.maxFeeEur !== undefined && s.maxFeeEur !== null ? 'tavan' : 'değer'}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <Button variant="ghost" onClick={onOpen}>Kısa listeyi düzenle</Button>
    </section>
  )
}
