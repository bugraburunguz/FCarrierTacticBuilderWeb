import type { ReactNode } from 'react'
import type { WeaponState } from '../../../api/types'
import { PlayerCard, type CardPlayer } from '../../../components/card/PlayerCard'
import type { FitState } from '../../../components/card/FitBadge'
import { ChemDiamonds } from '../../../components/card/ChemDiamonds'
import { Chip, EmptyState, Skeleton } from '../../../design/components/primitives'

/** Rozet → uyum durumu (sahadaki rozetle aynı eşlemeler). */
export const FIT_STATE: Record<WeaponState, FitState> = { GREEN: 'good', YELLOW: 'ok', RED: 'bad' }

export interface PickRow {
  key: string
  name: string
  ovr: number
  positions: string[]
  sub?: string
  /** Slotun rolüne uyum % (sahadaki % ile aynı hesap); sıralama buna göredir. */
  fitPct?: number
  fitState?: FitState
  /** Slota konursa kimya önizlemesi (yalnız UT). */
  chem?: 0 | 1 | 2 | 3
  /** Mod notu: kariyerde form, UT'de "untradeable" gibi. */
  note?: string
  /** Yalnız UT. */
  price?: string
  disabled?: boolean
  current?: boolean
  card: CardPlayer
  onPick: () => void
}

/** Uyum % azalan; uyumu henüz bilinmeyenler en sonda, kendi içinde OVR'a göre. OVR tek başına sıra ölçütü değildir. */
export function sortByFit(rows: PickRow[]): PickRow[] {
  return [...rows].sort((a, b) => (b.fitPct ?? -1) - (a.fitPct ?? -1) || b.ovr - a.ovr || a.name.localeCompare(b.name, 'tr'))
}

const THUMB = 44

export interface PickListProps {
  rows: PickRow[]
  loading?: boolean
  emptyText: ReactNode
  search: string
  onSearch: (value: string) => void
  /** Veri kaynağı sekmeleri (UT: kulüp/market/katalog); kariyerde yok. */
  tabs?: { id: string; label: string }[]
  activeTab?: string
  onTab?: (id: string) => void
  /** Slotu boşalt (yalnız doluyken). */
  onClear?: () => void
  footer?: ReactNode
}

/**
 * Mevkiye tıklayınca açılan oyuncu/kart listesi (08 §15): iki modun TEK bileşeni. Yalnız o mevkide oynayabilenler,
 * sıra slotun rolüne uyum %'sine göre; satırlar küçük kart biçiminde (OVR, isim, mevki, uyum %, kimya önizlemesi, form/fiyat).
 */
export function PickList({ rows, loading, emptyText, search, onSearch, tabs, activeTab, onTab, onClear, footer }: PickListProps) {
  const sorted = sortByFit(rows)
  return (
    <div className="space-y-3">
      {tabs && (
        <div role="group" aria-label="Kart kaynağı" className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Chip key={t.id} onClick={() => onTab?.(t.id)} pressed={activeTab === t.id}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="İsim ara…"
        aria-label="Oyuncu ara"
        className="glass-3 min-h-10 w-full px-3 text-sm text-ink placeholder:text-muted max-sm:min-h-11"
      />
      {onClear && (
        <button type="button" onClick={onClear} className="glass-3 min-h-10 w-full px-3 text-sm font-medium text-ink-2 hover:bg-[var(--glass-hover)] max-sm:min-h-11">
          Slotu boşalt
        </button>
      )}
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState>{emptyText}</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                disabled={row.disabled}
                aria-current={row.current ? 'true' : undefined}
                onClick={row.onPick}
                className={`glass-3 flex min-h-14 w-full items-center gap-3 px-2 py-1.5 text-left text-ink hover:bg-[var(--glass-hover)] disabled:cursor-not-allowed disabled:text-muted ${row.current ? 'ring-2 ring-accent' : ''}`}
              >
                <span className="shrink-0" style={{ width: THUMB }}>
                  <PlayerCard player={row.card} width={THUMB} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <b className="font-[var(--font-num)] text-base tabular-nums">{row.ovr}</b>
                    <span className="truncate text-sm font-semibold">{row.name}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {row.positions.slice(0, 4).join(' / ')}
                    {row.sub ? ` · ${row.sub}` : ''}
                    {row.note ? ` · ${row.note}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                  {row.fitPct !== undefined ? (
                    <span className={`font-semibold tabular-nums ${row.fitState === 'good' ? 'text-good' : row.fitState === 'bad' ? 'text-bad' : 'text-warn'}`}>%{row.fitPct}</span>
                  ) : (
                    <span className="text-muted">%–</span>
                  )}
                  {row.chem !== undefined && <ChemDiamonds value={row.chem} size={10} />}
                  {row.price && <span className="font-[var(--font-num)] tabular-nums text-ink-2">{row.price}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </div>
  )
}
