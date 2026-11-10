import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { endpoints } from '../../api/endpoints'
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
export function FilterPanel({ filters, onChange, gender, careerId }: { filters: TransferFilters; onChange: (next: Record<string, string | undefined>) => void; gender?: number; careerId?: number }) {
  const ids = { ovr: useId(), pot: useId(), league: useId(), nation: useId() }
  const num = (v: string) => (v === '' ? undefined : v)
  // FCA-5: lig ve uyruk listeleri (herkese açık arama listeleri; kariyerin cinsiyetine göre lig).
  const leagues = useQuery({ queryKey: ['leagues', gender], queryFn: () => endpoints.leagues(gender), staleTime: Infinity })
  const nationalities = useQuery({ queryKey: ['nationalities'], queryFn: endpoints.nationalities, staleTime: Infinity })
  // FCA-6: kulübün erişemeyeceği ligler seçilemez (öneri isteği 422 döner); alınamazsa kısıt gösterilmez, sunucu yine korur.
  const reach = useQuery({ queryKey: ['reachable-leagues', careerId], queryFn: () => endpoints.reachableLeagues(careerId!), enabled: careerId !== undefined, retry: false, staleTime: 300_000 })
  const reachable = reach.data?.restricted ? new Set(reach.data.leagueIds) : undefined
  return (
    <section aria-label="Ayrıntılı filtre" className="glass-2 flex flex-col gap-3 p-3 sm:p-4">
      <h2 className="panel-title font-display text-xl font-semibold leading-6">Ayrıntılı filtre</h2>
      <div className="grid grid-cols-1 gap-2">
        <label htmlFor={ids.league} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Lig
          <select id={ids.league} className={INPUT} value={filters.leagueId ?? ''} onChange={(e) => onChange({ [FILTER_PARAMS.leagueId]: num(e.target.value) })}>
            <option value="">Fark etmez</option>
            {/* Adresteki lig listede yoksa (eski bağlantı, başka cinsiyet) süzgeç gizli kalmasın. */}
            {filters.leagueId !== undefined && !(leagues.data ?? []).some((l) => l.id === filters.leagueId) && (
              <option value={filters.leagueId}>Bilinmeyen lig ({filters.leagueId})</option>
            )}
            {(leagues.data ?? []).map((l) => {
              const out = reachable !== undefined && !reachable.has(l.id)
              return <option key={l.id} value={l.id} disabled={out}>{out ? `${l.name} · erişim dışı` : l.name}</option>
            })}
          </select>
        </label>
        <label htmlFor={ids.nation} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
          Uyruk
          <select id={ids.nation} className={INPUT} value={filters.nationalityId ?? ''} onChange={(e) => onChange({ [FILTER_PARAMS.nationalityId]: num(e.target.value) })}>
            <option value="">Fark etmez</option>
            {filters.nationalityId !== undefined && !(nationalities.data ?? []).some((n) => n.id === filters.nationalityId) && (
              <option value={filters.nationalityId}>Bilinmeyen uyruk ({filters.nationalityId})</option>
            )}
            {(nationalities.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </label>
        <p className="text-xs text-ink-2">Lig ve uyruk yeni öneri ister (kredi): değiştirince "Önerileri getir".</p>
      </div>
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
      <p className="text-xs text-ink-2">OVR, POT ve değer gelen adayları süzer; yeni istek atılmaz, kredi düşmez.</p>
      <Button variant="ghost" onClick={() => onChange(Object.fromEntries(Object.values(FILTER_PARAMS).map((p) => [p, undefined])))}>Sıfırla</Button>
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
