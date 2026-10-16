import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, Clock, Pause, Star } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, CareerRecommendationItem } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { MoneyInput } from '../../components/MoneyInput'
import { ShortlistLabel } from '../../components/ShortlistLabel'
import { HelpPopover } from '../../components/ui'
import { useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, EmptyState, Skeleton, StatTile } from '../../design/components/primitives'
import { sellAdvice, type SellAdvice } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { LeagueLevelChip } from '../careerPlayers/LeagueLevelChip'
import { RecommendationPanel } from '../recommend/RecommendationPanel'
import { useAutoLineup } from '../squad/useAutoLineup'
import { useCareerBinding } from '../squad/useCareerBinding'
import { useSlotFits } from '../squad/useSlotFits'
import { useSquadWorkspace } from '../squad/useSquadWorkspace'
import { budgetAfterPurchase, contractMonthsLeft, shortlistCost, transferNeeds } from './transferPlan'

const STALE_MS = 120_000
/** Aday satırı kartı: sm (92px), dar ekranda xs (60px). */
const CANDIDATE_CARD = 92
const CANDIDATE_CARD_MOBILE = 60
const ADVICE: Record<SellAdvice['kind'], { label: string; icon: typeof Star; order: number }> = {
  SELL: { label: 'Sat', icon: ArrowDownRight, order: 0 },
  LOAN: { label: 'Kirala', icon: Clock, order: 1 },
  KEEP: { label: 'Tut', icon: Pause, order: 2 },
}
const NUM = 'font-[var(--font-num)] tabular-nums'

const dateText = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Başlıklı bölüm (aria-label = başlık): Transfer Merkezi'nin dört alanı aynı çerçeveyi kullanır. */
function Section({ title, actions, children, className = '' }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={`glass-2 flex min-w-0 flex-col gap-3 p-3 sm:p-4 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

/** Aday satırı altı: değer çubuğu (bütçeye oran; veri varsa), alım sonrası bütçe, lig seviyesi. */
function CandidateExtra({ item, budget, leagueOvr }: { item: CareerRecommendationItem; budget?: number; leagueOvr?: number }) {
  const value = item.player.valueEur
  const after = budgetAfterPurchase(budget, value)
  const share = budget !== undefined && value !== undefined && budget > 0 ? Math.min(1, value / budget) : undefined
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-2">
      {share !== undefined && (
        <span className="flex min-w-[160px] flex-1 items-center gap-2">
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--glass-3)]">
            <span className={`block h-full rounded-full ${value! > budget! ? 'bg-bad' : 'bg-accent'}`} style={{ width: `${share * 100}%` }} />
          </span>
          <span className={NUM}>Değer bütçenin %{Math.round((value! / budget!) * 100)}'i</span>
        </span>
      )}
      {after !== undefined && <span className={`${NUM} font-medium ${after < 0 ? 'text-bad' : 'text-ink'}`}>Alım sonrası bütçe {formatEur(after)}</span>}
      <LeagueLevelChip overall={item.player.overall} leagueOvr={leagueOvr} />
    </div>
  )
}

/**
 * Transfer Merkezi v3 (V3-06c, 08 §9): bütçe bandı → İhtiyaçlar (sahadaki rozetle aynı kaynak, çipler) → Adaylar (kariyer öneri hattı,
 * kahraman) → Kısa liste (pazarlık tavanı) → Satış planı (Masa kuralları). Seçili ihtiyaç, "Tüm kadro" ve uzak ihtimaller adres çubuğunda.
 * Yalnız v3 uçları: rol uyumu `/fit/role` v3, öneriler `POST /careers/{id}/recommendations`.
 */
export function TransferCenterPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const mobile = useIsMobile()
  const [params, setParams] = useSearchParams()
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v === undefined ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const facets = useQuery({ queryKey: ['player-facets', id], queryFn: () => endpoints.playerFacets(id!), enabled: id !== undefined, staleTime: STALE_MS })
  const { binding, playerById } = useCareerBinding(id, squad.data)
  const ws = useSquadWorkspace('career', binding)
  const { rows: fitRows, pending: fitsPending } = useSlotFits(ws, playerById)
  useAutoLineup(ws, id, squad.data?.length ?? 0)
  const shortlist = useQuery({ queryKey: ['shortlist', id], queryFn: () => endpoints.shortlist(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })

  const allSquad = params.get('kadro') === 'tum'
  const longShots = params.get('uzak') === '1'
  const needs = useMemo(() => transferNeeds(fitRows, allSquad, squad.data ?? []), [fitRows, allSquad, squad.data])
  const wantedPos = params.get('pos')
  const wantedRole = params.get('role')
  const need = needs.find((n) => n.key === params.get('ihtiyac'))
    ?? needs.find((n) => n.position === wantedPos && (!wantedRole || n.roleId === wantedRole)) ?? needs[0]

  const invalidate = () => client.invalidateQueries({ queryKey: ['shortlist', id] })
  const add = useMutation({ mutationFn: (item: CareerRecommendationItem) => endpoints.shortlistAdd(id!, item.player.id, { note: need?.label }), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (playerId: number) => endpoints.shortlistRemove(id!, playerId), onSuccess: invalidate })
  const setFee = useMutation({ mutationFn: ({ playerId, fee, note }: { playerId: number; fee?: number; note?: string }) => endpoints.shortlistAdd(id!, playerId, { maxFeeEur: fee, note }), onSuccess: invalidate })

  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const starters = useMemo(() => new Set(fitRows.map((r) => r.playerId)), [fitRows])
  const plan = useMemo(() => (squad.data ?? [])
    .map((c) => ({ c, advice: sellAdvice(c, starters, tags) }))
    .sort((a, b) => ADVICE[a.advice.kind].order - ADVICE[b.advice.kind].order || (valueOf(b.c) ?? 0) - (valueOf(a.c) ?? 0)), [squad.data, starters, tags])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Transfer Merkezi</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState>
      </div>
    )
  }

  // Bütçe girilmemişse (ya da ≤ 0) bilinmiyor: "—" ve neden; 0'a çevrilmez (ENG-02).
  const budget = career.budgetEur !== undefined && career.budgetEur !== null && career.budgetEur > 0 ? career.budgetEur : undefined
  const items = shortlist.data ?? []
  const cost = shortlistCost(items)
  const after = budgetAfterPurchase(budget, cost.total)
  const inList = new Set(items.map((s) => s.playerId))
  const gameDate = facets.data?.gameDate
  const showContract = gameDate !== undefined && plan.some(({ c }) => c.player.contractUntil)
  const showValue = plan.some(({ c }) => valueOf(c) !== undefined)

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Transfer Merkezi</h1>
        <p className="text-sm text-ink-2">{career.clubName ?? career.name}</p>
      </header>

      <section aria-label="Bütçe" className="glass flex flex-col gap-2 p-3">
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          <StatTile label="Transfer bütçesi" value={budget === undefined ? '—' : formatEur(budget)} />
          <StatTile label="Kısa liste (tahmini bedel)" value={cost.total === undefined ? '—' : formatEur(cost.total)} />
          <StatTile label="Alım sonrası bütçe" value={after === undefined ? '—' : formatEur(after)} />
        </div>
        <p className="text-xs text-muted">
          {budget === undefined ? 'Bütçe girilmemiş: kariyer ayarlarından gir; alım sonrası bütçe hesaplanmaz. ' : ''}
          {cost.count === 0 ? 'Kısa liste boş.' : `Tahmini bedel: pazarlık tavanı, yoksa piyasa değeri${cost.unknown > 0 ? ` · ${cost.unknown} oyuncunun bedeli bilinmiyor` : ''}.`}
        </p>
      </section>

      <Section title="İhtiyaçlar" actions={(
        <span className="flex items-center gap-2">
          <Chip pressed={allSquad} onClick={() => set({ kadro: allSquad ? undefined : 'tum', ihtiyac: undefined })}>Tüm kadro</Chip>
          <HelpPopover label="İhtiyaçlar">Zayıf halka: sahadaki rozeti sarı ya da kırmızı olan oyuncular (seviyesine göre), en zayıf başta. Derinlik açıkları da gelir.</HelpPopover>
        </span>
      )}>
        {needs.length === 0 ? (
          <EmptyState>{fitsPending ? 'Hesaplanıyor…' : allSquad ? 'Dizilimde oyuncu yok.' : 'Zayıf halka yok: dizilimdeki herkes seviyesinde ya da üstünde.'}</EmptyState>
        ) : (
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 max-sm:snap-x">
            {needs.map((n) => (
              <li key={n.key} className="shrink-0 snap-start">
                <button type="button" aria-pressed={need?.key === n.key} onClick={() => set({ ihtiyac: n.key, pos: undefined, role: undefined })}
                  className={`flex min-h-11 flex-col items-start gap-0.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-left text-sm ${need?.key === n.key ? 'border-accent bg-[var(--glass-press)] shadow-[inset_0_-2px_0_var(--accent)]' : 'border-[var(--glass-border)] glass-3 hover:bg-[var(--glass-hover)]'}`}>
                  <span className="flex items-center gap-2 whitespace-nowrap font-semibold">{n.label}{n.state && <FitBadge state={n.state} compact />}</span>
                  <span className="whitespace-nowrap text-xs text-ink-2">{n.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-start">
        <Section title={need ? `Adaylar · ${need.label}` : 'Adaylar'} className="min-[1024px]:flex-1">
          {need ? (
            <RecommendationPanel
              key={need.key}
              careerId={id}
              position={need.position}
              roleId={need.roleId}
              cardWidth={mobile ? CANDIDATE_CARD_MOBILE : CANDIDATE_CARD}
              longShots={longShots}
              onLongShotsChange={(v) => set({ uzak: v ? '1' : undefined })}
              longShotsLabel="Uzak ihtimalleri göster"
              rowExtra={(item) => <CandidateExtra item={item} budget={budget} leagueOvr={facets.data?.leagueOvr} />}
              rowAction={(item) => (
                <Button variant={inList.has(item.player.id) ? 'secondary' : 'primary'} aria-pressed={inList.has(item.player.id)}
                  onClick={() => (inList.has(item.player.id) ? remove.mutate(item.player.id) : add.mutate(item))}>
                  <Star size={14} aria-hidden="true" fill={inList.has(item.player.id) ? 'currentColor' : 'none'} /> {inList.has(item.player.id) ? 'Listede' : 'Kısa liste'}
                </Button>
              )}
            />
          ) : (
            <EmptyState action={!allSquad ? <Button onClick={() => set({ kadro: 'tum', ihtiyac: undefined })}>Tüm kadroyu göster</Button> : undefined}>
              {allSquad ? 'Dizilimde oyuncu yok.' : 'Zayıf halka yok. Bir mevkiye aday aramak için tüm kadroyu göster.'}
            </EmptyState>
          )}
        </Section>

        <Section title={`Kısa liste (${items.length})`} className="min-[1024px]:w-[400px] min-[1024px]:shrink-0">
          {items.length === 0 ? <EmptyState>Adaylardan kısa listeye ekle, pazarlık tavanını yaz.</EmptyState> : (
            <>
              <ul className="flex flex-col gap-2">
                {items.map((s) => (
                  <li key={s.playerId} className="glass-3 flex flex-col gap-2 p-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <ShortlistLabel item={s} />
                      <Button variant="ghost" onClick={() => remove.mutate(s.playerId)}>Çıkar</Button>
                    </div>
                    <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                      Pazarlık tavanı
                      <MoneyInput key={s.playerId} ariaLabel="Pazarlık tavanı" value={s.maxFeeEur ?? undefined} onChange={() => undefined} onCommit={(fee) => setFee.mutate({ playerId: s.playerId, fee, note: s.note })} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-2">
                Toplam <b className={`${NUM} text-ink`}>{cost.total === undefined ? '—' : formatEur(cost.total)}</b>
                {after !== undefined && <> · alım sonrası bütçe <b className={`${NUM} ${after < 0 ? 'text-bad' : 'text-ink'}`}>{formatEur(after)}</b></>}
              </p>
            </>
          )}
        </Section>
      </div>

      <Section title="Satış planı" actions={<HelpPopover label="Satış planı">Masa ile aynı kurallar: ilk 11 dışı ve satılık işaretli ya da 29+ yaş → sat; ilk 11 dışı, 21 yaş ve altı, potansiyeli 6+ puan üstünde → kirala; diğerleri tut.</HelpPopover>}>
        {plan.length === 0 ? <EmptyState>Kadroda oyuncu yok.</EmptyState> : (
          <>
            {plan.some((p) => p.advice.kind !== 'KEEP')
              ? <PlanRows rows={plan.filter((p) => p.advice.kind !== 'KEEP')} mobile={mobile} showValue={showValue} showContract={showContract} gameDate={gameDate} />
              : <p className="text-sm text-ink-2">Satış ya da kiralama önerisi yok.</p>}
            {plan.some((p) => p.advice.kind === 'KEEP') && (
              <details className="text-sm">
                <summary className="min-h-8 cursor-pointer font-semibold text-accent max-sm:min-h-11">Tut olarak kalanlar ({plan.filter((p) => p.advice.kind === 'KEEP').length})</summary>
                <PlanRows rows={plan.filter((p) => p.advice.kind === 'KEEP')} mobile={mobile} showValue={showValue} showContract={showContract} gameDate={gameDate} />
              </details>
            )}
          </>
        )}
      </Section>
    </div>
  )
}

const valueOf = (c: CareerPlayer) => c.valueEur ?? c.player.valueEur
const valueText = (c: CareerPlayer) => {
  const value = valueOf(c)
  return value === undefined ? undefined : `${c.player.valuationEstimated && c.valueEur === undefined ? '≈' : ''}${formatEur(value)}`
}
const contractText = (gameDate: string | undefined, until: string) => {
  const months = contractMonthsLeft(gameDate, until)
  return `${dateText(until)}${months === undefined ? '' : ` · ${months} ay`}`
}

/** Satış planı satırları: masaüstünde tablo, mobilde kart listesi; veri olmayan sütun (değer, sözleşme) gösterilmez. */
function PlanRows({ rows, mobile, showValue, showContract, gameDate }: { rows: { c: CareerPlayer; advice: SellAdvice }[]; mobile: boolean; showValue: boolean; showContract: boolean; gameDate?: string }) {
  if (mobile) {
    return (
      <ul className="flex flex-col gap-2">
        {rows.map(({ c, advice }) => (
          <li key={c.player.id} className="glass-3 flex flex-col gap-1 p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/players/${c.player.id}`} className="font-semibold underline decoration-dotted underline-offset-2">{c.player.name}</Link>
              <AdviceChip kind={advice.kind} />
            </div>
            <p className="flex flex-wrap gap-x-3 text-xs text-ink-2">
              {showValue && valueOf(c) !== undefined && <span className={NUM}>{valueText(c)}</span>}
              {showContract && c.player.contractUntil && <span>{contractText(gameDate, c.player.contractUntil)}</span>}
            </p>
            <p className="text-xs text-muted">{advice.reason}</p>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Satış planı</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th scope="col" className="py-1.5 pr-3 text-left font-medium">Oyuncu</th>
            {showValue && <th scope="col" className="py-1.5 pr-3 text-right font-medium">Değer</th>}
            {showContract && <th scope="col" className="py-1.5 pr-3 text-left font-medium">Sözleşme bitişi</th>}
            <th scope="col" className="py-1.5 pr-3 text-left font-medium">Öneri</th>
            <th scope="col" className="py-1.5 text-left font-medium">Gerekçe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, advice }) => (
            <tr key={c.player.id} className="border-t border-[var(--glass-border)]">
              <td className="py-1.5 pr-3"><Link to={`/players/${c.player.id}`} className="font-medium text-ink hover:underline">{c.player.name}</Link></td>
              {showValue && <td className={`py-1.5 pr-3 text-right text-ink-2 ${NUM}`}>{valueText(c) ?? '–'}</td>}
              {showContract && <td className="whitespace-nowrap py-1.5 pr-3 text-ink-2">{c.player.contractUntil ? contractText(gameDate, c.player.contractUntil) : '–'}</td>}
              <td className="py-1.5 pr-3"><AdviceChip kind={advice.kind} /></td>
              <td className="py-1.5 text-xs text-ink-2">{advice.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Öneri çipi: nötr çip + simge (renk tek başına anlam taşımaz). */
function AdviceChip({ kind }: { kind: SellAdvice['kind'] }) {
  const { label, icon: Icon } = ADVICE[kind]
  return <Chip><Icon size={12} aria-hidden="true" />{label}</Chip>
}
