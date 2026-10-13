import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import type { WeaponState } from '../../../api/types'
import { ChemDiamonds } from '../../../components/card/ChemDiamonds'
import { Modal } from '../../../components/Modal'
import { BadgeDot, EmptyState, Input, Pill, Spinner } from '../../../components/ui'
import { coins } from '../../../lib/coins'
import { fromSummary, personKey, type CardSource, type UtCard } from '../../../lib/utCard'
import { utCardStore } from '../../../state/utCardStore'

const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }
const SOURCE_LABEL: Record<CardSource, string> = { club: 'Kulübüm', market: 'Market', catalog: 'Katalog' }
const MAX_LISTED = 60

/** UT'ye özgü kart seçimi (kulüp/market/katalog kaynakları, fiyat, kimya bağı): çekirdeğin yan paneline ve klasik modala gövde verir. */
export interface PickProps {
  position: string
  slotId: string
  current?: UtCard
  roleName?: string
  evaluation?: {
    card: { metaRating: number; tier: string; bestChemStyle?: string; chemStyles?: { style: string; metaRating: number; delta: number }[] }
    roleFit?: number
    badge?: WeaponState
    roleName?: string
    setupDelta?: number
    reason?: string
  }
  chemLinks?: number
  usedKeys: Set<string>
  onClose: () => void
  onPick: (c: UtCard) => void
}

function CurrentCard({ card, evaluation, chemLinks }: { card: UtCard; evaluation: PickProps['evaluation']; chemLinks?: number }) {
  const links = chemLinks ?? 0
  return (
    <div className="mb-3 space-y-1.5 rounded-md border border-line bg-surface-2 p-3 text-sm">
      <p className="font-semibold">{card.name}</p>
      <p className="text-xs text-muted">
        {SOURCE_LABEL[card.source]} · {card.rating} OVR{card.rarity ? ` · ${card.rarity}` : ''}{card.club ? ` · ${card.club}` : ''} · fiyat {coins(card.price)}
        {card.untradeable ? ' · untradeable' : ''}
      </p>
      {evaluation ? (
        <>
          <p>
            Meta rating* <b className="text-lg tabular-nums">{evaluation.card.metaRating}</b> <Pill tone={TIER_TONE[evaluation.card.tier] ?? 'slate'}>{evaluation.card.tier}</Pill>
            {' · '}Kimya <ChemDiamonds value={links} size={12} />
          </p>
          {evaluation.roleFit !== undefined && (
            <p className="flex items-center gap-1.5">
              {evaluation.badge && <BadgeDot state={evaluation.badge} />} RoleFit <b>%{Math.round(evaluation.roleFit)}</b> · {evaluation.roleName}
              {evaluation.setupDelta !== undefined && evaluation.setupDelta !== 0 && <span className="text-xs text-muted">(ayar {evaluation.setupDelta > 0 ? '+' : ''}{evaluation.setupDelta})</span>}
            </p>
          )}
          {evaluation.reason && <p className="text-xs text-muted">{evaluation.reason}</p>}
          {evaluation.card.chemStyles && (
            <p className="text-xs">
              Chem style önerisi: <b>{evaluation.card.bestChemStyle}</b>{' '}
              {evaluation.card.chemStyles.filter((c) => c.style === evaluation.card.bestChemStyle).map((c) => `(meta ${c.metaRating}, +${c.delta})`)}
            </p>
          )}
          {!card.club && card.source !== 'catalog' && (
            <p className="text-xs text-code">Bu kartın kulüp/lig/ülke adı çözülemedi; kimya bağları hesaba katılmıyor olabilir.</p>
          )}
        </>
      ) : (
        <Spinner />
      )}
    </div>
  )
}

/** Kart seçim gövdesi (kaynak sekmeleri + arama + liste): modalda ve v3 yan panelinde ortak. */
export function PickBody({ position, current, evaluation, chemLinks, usedKeys, onPick }: Omit<PickProps, 'slotId' | 'onClose'>) {
  const library = useMemo(() => utCardStore.get(), [])
  const [source, setSource] = useState<CardSource>(library && library.cards.some((c) => c.source === 'club') ? 'club' : 'catalog')
  const [q, setQ] = useState('')
  const catalog = useQuery({
    queryKey: ['ut-pick', position, q],
    queryFn: () => endpoints.players({ pos: [position], q: q || undefined, sort: 'overall', order: 'desc', size: 20, gender: 0 }),
    enabled: source === 'catalog',
    staleTime: 60_000,
  })
  const local = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (library?.cards ?? [])
      .filter((c) => c.source === source && c.positions.includes(position) && (!needle || c.name.toLowerCase().includes(needle)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, MAX_LISTED)
  }, [library, source, position, q])
  const rows: UtCard[] = source === 'catalog' ? (catalog.data?.items ?? []).map(fromSummary) : local
  const counts: Record<CardSource, number> = {
    club: library?.cards.filter((c) => c.source === 'club').length ?? 0,
    market: library?.cards.filter((c) => c.source === 'market').length ?? 0,
    catalog: 0,
  }

  return (
    <>
      {current && <CurrentCard card={current} evaluation={evaluation} chemLinks={chemLinks} />}
      <div role="tablist" aria-label="Kart kaynağı" className="mb-3 flex gap-1">
        {(['club', 'market', 'catalog'] as CardSource[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={source === s}
            onClick={() => setSource(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${source === s ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-ink/80 hover:bg-surface-2'}`}
          >
            {SOURCE_LABEL[s]}{s !== 'catalog' ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>
      <Input placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Kart ara" />
      <div className="mt-3 max-h-80 overflow-y-auto">
        {source === 'catalog' && catalog.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>
            {source === 'catalog' ? 'Sonuç yok.' : counts[source] === 0 ? (
              <>Henüz {SOURCE_LABEL[source].toLowerCase()} verisi yok. <Link to="/ut/import" className="text-accent underline">Kulüp içe aktar</Link> sayfasından yakalama dosyanı yükle.</>
            ) : 'Bu mevkide kart yok.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((c) => (
              <li key={c.key}>
                <button type="button" disabled={usedKeys.has(personKey(c)) && (!current || personKey(c) !== personKey(current))} className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left hover:bg-surface-2 disabled:opacity-40" onClick={() => onPick(c)}>
                  <span>
                    <b>{c.rating}</b> {c.name} <span className="text-xs text-muted">{c.club ?? ''}{c.rarity ? ` · ${c.rarity}` : ''}</span>
                    {c.untradeable && <Pill tone="emerald">untradeable</Pill>}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{c.price !== undefined ? coins(c.price) : c.league ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {source === 'catalog' && <p className="mt-2 text-xs text-muted">Katalog kartları temel EA kartlarıdır; fiyatları yoktur.</p>}
      {library && <p className="mt-2 text-xs text-muted">Kulüp/market verisi: {new Date(library.importedAt).toLocaleString('tr-TR')} tarihli yakalama.</p>}
    </>
  )
}

export function PickModal({ slotId, position, onClose, ...body }: PickProps) {
  return (
    <Modal wide title={`${slotId} · ${position} — Kart seç`} hint="Kulüp kartların, market ilanları veya katalog" onClose={onClose}>
      <PickBody position={position} {...body} />
    </Modal>
  )
}
