import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import type { WeaponState } from '../../../api/types'
import { ChemDiamonds } from '../../../components/card/ChemDiamonds'
import type { FitState } from '../../../components/card/FitBadge'
import { Modal } from '../../../components/Modal'
import { BadgeDot, HelpPopover, Pill, Spinner } from '../../../components/ui'
import { cardPlayerOf } from '../../../lib/cardPlayer'
import { coins, shortCoins } from '../../../lib/coins'
import { fromSummary, personKey, type CardSource, type UtCard } from '../../../lib/utCard'
import { utCardStore } from '../../../state/utCardStore'
import { CardName } from '../../../components/card/CardName'
import { FIT_STATE, PickList, type PickRow } from '../pick/PickList'

const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }
const SOURCE_LABEL: Record<CardSource, string> = { club: 'Kulübüm', market: 'Market', catalog: 'Katalog' }
const MAX_LISTED = 60
/** utSquadEvaluate bir istekte en çok 18 slot alır (backend UtSquadModels.MAX_SLOTS). */
const MAX_EVALUATE = 18

/** UT'ye özgü kart seçimi: kaynaklar (kulüp/market/katalog), fiyat, kimya önizlemesi. Liste/sıralama/satır biçimi ortak PickList'te. */
export interface PickProps {
  position: string
  slotId: string
  current?: UtCard
  roleName?: string
  /** Slotun çözülmüş rolü: uyum % bu role göre hesaplanır. */
  roleId?: string
  setup?: { buildUp: 'Short' | 'Balanced' | 'Counter'; depth: number }
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
  /** Aday slota konursa o slotun kimyası (0-3). */
  chemFor?: (card: UtCard) => 0 | 1 | 2 | 3
  onClose: () => void
  onPick: (c: UtCard) => void
  onClear?: () => void
}

function CurrentCard({ card, evaluation, chemLinks }: { card: UtCard; evaluation: PickProps['evaluation']; chemLinks?: number }) {
  const links = chemLinks ?? 0
  return (
    <div className="mb-3 space-y-1.5 rounded-md border border-line bg-surface-2 p-3 text-sm">
      <p className="font-semibold"><CardName assetId={card.assetId} name={card.name} position={card.positions[0]} rating={card.rating} /></p>
      <p className="text-xs text-muted">
        {SOURCE_LABEL[card.source]} · {card.rating} OVR{card.rarity ? ` · ${card.rarity}` : ''}{card.club ? ` · ${card.club}` : ''} · fiyat {coins(card.price)}
        {card.untradeable ? ' · untradeable' : ''}
      </p>
      {evaluation ? (
        <>
          <p>
            Meta rating* <HelpPopover label="Meta rating nedir">Meta rating platformun tahmin metriğidir: kartın rol ağırlıklı attribute'larından ve evrensel meta eğrisinden hesaplanır, EA'nın resmî bir değeri değildir. Kendi kulüp kartlarında gerçek attribute'lar kullanılır; katalog kartlarında temel kart değerleri. Rol uyumu (RoleFit) ayrı bir ölçüdür.</HelpPopover> <b className="text-lg tabular-nums">{evaluation.card.metaRating}</b> <Pill tone={TIER_TONE[evaluation.card.tier] ?? 'slate'}>{evaluation.card.tier}</Pill>
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

const chunk = <V,>(items: V[], size: number): V[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

/** Kart seçim gövdesi: ortak PickList + UT veri kaynakları (kulüp/market/katalog), fiyat ve kimya önizlemesi. Modalda ve yan panelde ortak. */
export function PickBody({ position, current, evaluation, chemLinks, usedKeys, roleId, setup, chemFor, onPick, onClear }: Omit<PickProps, 'slotId' | 'onClose'>) {
  const library = useMemo(() => utCardStore.get(), [])
  const [source, setSource] = useState<CardSource>(library && library.cards.some((c) => c.source === 'club') ? 'club' : 'catalog')
  const [q, setQ] = useState('')
  const catalog = useQuery({
    queryKey: ['ut-pick', position, q],
    queryFn: () => endpoints.players({ pos: [position], q: q || undefined, sort: 'overall', order: 'desc', size: 20, gender: 0 }),
    enabled: source === 'catalog',
    staleTime: 60_000,
  })
  // Yalnız bu mevkide oynayabilenler (ana + alternatif mevki).
  const cards: UtCard[] = useMemo(() => {
    if (source === 'catalog') {
      return (catalog.data?.items ?? []).map(fromSummary).filter((c) => c.positions.includes(position))
    }
    const needle = q.trim().toLowerCase()
    return (library?.cards ?? []).filter((c) => c.source === source && c.positions.includes(position) && (!needle || c.name.toLowerCase().includes(needle))).sort((a, b) => b.rating - a.rating).slice(0, MAX_LISTED)
  }, [library, source, position, q, catalog.data])
  const counts: Record<CardSource, number> = {
    club: library?.cards.filter((c) => c.source === 'club').length ?? 0,
    market: library?.cards.filter((c) => c.source === 'market').length ?? 0,
    catalog: 0,
  }

  // Uyum %: sahadaki rozetle aynı uç (utSquadEvaluate), aynı rol ve takım ayarı; adaylar 18'lik gruplar hâlinde değerlendirilir.
  const evaluable = cards.filter((c) => c.attrs || c.playerId !== undefined)
  const groups = chunk(evaluable, MAX_EVALUATE)
  const fits = useQueries({
    queries: groups.map((group) => ({
      queryKey: ['ut-pick-fit', position, roleId, setup?.buildUp, setup?.depth, group.map((c) => c.key).join(',')],
      queryFn: () =>
        endpoints.utSquadEvaluate({
          slots: group.map((c, i) => ({ slotId: `c${i}`, position, roleId, ...(c.attrs ? { card: { name: c.name, overall: c.rating, positions: c.positions, attrs: c.attrs } } : { playerId: c.playerId }) })),
          setup,
        }),
      enabled: roleId !== undefined,
      staleTime: 60_000,
      retry: false,
    })),
  })
  const fitByKey = new Map<string, { pct: number; state: FitState }>()
  groups.forEach((group, g) => {
    fits[g]?.data?.slots.forEach((e, i) => {
      if (e.roleFit !== undefined) {
        fitByKey.set(group[i].key, { pct: Math.round(e.roleFit), state: FIT_STATE[e.badge ?? 'YELLOW'] })
      }
    })
  })

  const rows: PickRow[] = cards.map((c) => {
    const fit = fitByKey.get(c.key)
    return {
      key: c.key,
      name: c.name,
      ovr: c.rating,
      positions: c.positions,
      sub: [c.club, c.rarity].filter(Boolean).join(' · ') || undefined,
      fitPct: fit?.pct,
      fitState: fit?.state,
      chem: chemFor?.(c),
      note: c.untradeable ? 'untradeable' : undefined,
      price: c.price !== undefined ? shortCoins(c.price) : undefined,
      disabled: usedKeys.has(personKey(c)) && (!current || personKey(c) !== personKey(current)),
      current: current !== undefined && personKey(c) === personKey(current),
      card: cardPlayerOf(c, position),
      onPick: () => onPick(c),
    }
  })

  return (
    <>
      {current && <CurrentCard card={current} evaluation={evaluation} chemLinks={chemLinks} />}
      <PickList
        rows={rows}
        loading={source === 'catalog' && catalog.isLoading}
        search={q}
        onSearch={setQ}
        tabs={(['club', 'market', 'catalog'] as CardSource[]).map((s) => ({ id: s, label: `${SOURCE_LABEL[s]}${s !== 'catalog' ? ` (${counts[s]})` : ''}` }))}
        activeTab={source}
        onTab={(id) => setSource(id as CardSource)}
        onClear={current ? onClear : undefined}
        emptyText={
          source === 'catalog' ? 'Sonuç yok.' : counts[source] === 0 ? (
            <>Henüz {SOURCE_LABEL[source].toLowerCase()} verisi yok. <Link to="/ut/import" className="text-accent underline">Kulüp içe aktar</Link> sayfasından yakalama dosyanı yükle.</>
          ) : 'Bu mevkide kart yok.'
        }
        footer={
          <>
            {source === 'catalog' && <p className="text-xs text-muted">Katalog kartları temel EA kartlarıdır; fiyatları yoktur.</p>}
            {library && <p className="text-xs text-muted">Kulüp/market verisi: {new Date(library.importedAt).toLocaleString('tr-TR')} tarihli yakalama.</p>}
          </>
        }
      />
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
