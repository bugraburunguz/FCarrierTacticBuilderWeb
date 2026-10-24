import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerRecommendationItem } from '../../api/types'
import { FitBadge } from '../../components/card/FitBadge'
import { MoneyInput } from '../../components/MoneyInput'
import { ShortlistButton } from '../../components/ShortlistButton'
import { ShortlistLabel } from '../../components/ShortlistLabel'
import { HelpPopover } from '../../components/ui'
import { useIsMobile } from '../../design/components/MobileSheet'
import { Button, Chip, EmptyState, ErrorState, Skeleton, SourceTag, TabPanel, Tabs } from '../../design/components/primitives'
import { formatEur } from '../../lib/format'
import { useActiveCareerId } from '../../state/careerStore'
import { LeagueLevelChip } from '../careerPlayers/LeagueLevelChip'
import { RecommendationPanel } from '../recommend/RecommendationPanel'
import { useMainTacticFits } from '../career/useMainTacticFits'
import { useTabParam } from '../player/playerPage'
import { BudgetPlanPanel } from './BudgetPlanPanel'
import { SellPlanTab } from './SellPlanTab'
import { budgetAfterPurchase, budgetPlan, needsForTransfer } from './transferPlan'
import { CAREER_PAGE_WIDTH } from '../../design/careerPage'

const STALE_MS = 120_000
const PREFIX = 'transfer'
/** Aday satırı kartı: sm (92px), dar ekranda xs (60px). */
const CANDIDATE_CARD = 92
const CANDIDATE_CARD_MOBILE = 60
const NUM = 'font-[var(--font-num)] tabular-nums'

/** Başlıklı bölüm (aria-label = başlık): Transfer sekmelerindeki alanlar aynı çerçeveyi kullanır. */
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
 * Transfer (KARIYER-UX FAZ 5, 15 §4.4, §5.7-5.8): sekmeler Adaylar · Kısa liste · Satış (`?sekme=`), yanda (mobilde üstte katlanır) Bütçe planı.
 * Adaylar: İhtiyaçlar (Masa'nın zayıf halka kuralı + derinlik açıkları; ana taktik yoksa başlangıç önerisi, "Otomatik öneri") ve kariyer öneri hattı
 * (CreditGuard arkasında). Okunan parametreler: `ihtiyac`, `pos`, `rol` (eski `role` takma ad), `sekme`, `oyuncu`, `kadro`, `uzak`.
 * Katman 1-2: kayıt (kadro) ve kararlar (ana taktik, kısa liste, satış planı); Lab taslağı ve eski tek kopya depolar okunmaz (kariyerUxGates).
 */
export function TransferCenterPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const mobile = useIsMobile()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const facets = useQuery({ queryKey: ['player-facets', id], queryFn: () => endpoints.playerFacets(id!), enabled: id !== undefined, staleTime: STALE_MS })
  const { main, rows: fitRows, pending: fitsPending } = useMainTacticFits(id, squad.data)
  const shortlist = useQuery({ queryKey: ['shortlist', id], queryFn: () => endpoints.shortlist(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const items = useMemo(() => shortlist.data ?? [], [shortlist.data])
  const tabs = [
    { id: 'adaylar' as const, label: 'Adaylar' },
    { id: 'kisa-liste' as const, label: `Kısa liste (${items.length})` },
    { id: 'satis' as const, label: 'Satış' },
  ]
  const { tab, setTab, params, set } = useTabParam(tabs)

  const allSquad = params.get('kadro') === 'tum'
  const longShots = params.get('uzak') === '1'
  const needs = useMemo(() => needsForTransfer(fitRows, allSquad, squad.data ?? []), [fitRows, allSquad, squad.data])
  const wantedPos = params.get('pos')
  const wantedRole = params.get('rol') ?? params.get('role')
  const need = needs.find((n) => n.key === params.get('ihtiyac'))
    ?? needs.find((n) => n.position === wantedPos && (!wantedRole || n.roleId === wantedRole)) ?? needs[0]
  const focusId = Number(params.get('oyuncu')) || undefined

  const invalidate = () => client.invalidateQueries({ queryKey: ['shortlist', id] })
  const remove = useMutation({ mutationFn: (playerId: number) => endpoints.shortlistRemove(id!, playerId), onSuccess: invalidate })
  const setFee = useMutation({ mutationFn: ({ playerId, fee, note }: { playerId: number; fee?: number; note?: string }) => endpoints.shortlistAdd(id!, playerId, { maxFeeEur: fee, note }), onSuccess: invalidate })
  const starters = useMemo(() => new Set(fitRows.map((r) => r.playerId)), [fitRows])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  // REVIEW Y5: hata boş durum gibi görünmez. Eldeki veri varken başarısız yenileme sayfayı düşürmez (Adaylar sonucu korunur).
  if (careers.isError && !careers.data) {
    return <ErrorState message="Kariyerler yüklenemedi." onRetry={() => careers.refetch()} />
  }
  if (!career) {
    return (
      <div className={`mx-auto ${CAREER_PAGE_WIDTH} py-2`}>
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Transfer Merkezi</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState>
      </div>
    )
  }

  // Bütçe girilmemişse (ya da ≤ 0) bilinmiyor: "—" ve neden; 0'a çevrilmez (ENG-02).
  const budget = career.budgetEur !== undefined && career.budgetEur !== null && career.budgetEur > 0 ? career.budgetEur : undefined
  const wageBudget = career.wageBudgetEur !== undefined && career.wageBudgetEur !== null && career.wageBudgetEur > 0 ? career.wageBudgetEur : undefined
  const computed = budgetPlan({ budgetEur: budget, wageBudgetEur: wageBudget, shortlist: items, squad: squad.data ?? [], tags: tagList.data ?? [] })
  // REVIEW Y5: kısa liste ya da satış planı alınamadıysa kalan bütçe eksik veriyle hesaplanmaz ("—").
  const loadFailed = (shortlist.isError && !shortlist.data) || (tagList.isError && !tagList.data) || (squad.isError && !squad.data)
  const plan = loadFailed ? { ...computed, remaining: undefined } : computed
  const after = budget === undefined ? undefined : budget - plan.shortlist.total
  const gameDate = facets.data?.gameDate
  const budgetPanel = <BudgetPlanPanel plan={plan} budget={budget} mobile={mobile} />

  return (
    <div className={`mx-auto flex w-full ${CAREER_PAGE_WIDTH} flex-col gap-3 py-2`}>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Transfer Merkezi</h1>
        <p className="text-sm text-ink-2">{career.clubName ?? career.name}</p>
      </header>
      {squad.isError && <ErrorState message="Kadro yüklenemedi." onRetry={() => squad.refetch()} />}
      {shortlist.isError && <ErrorState message="Kısa liste yüklenemedi." onRetry={() => shortlist.refetch()} />}
      {tagList.isError && <ErrorState message="Satış planı yüklenemedi." onRetry={() => tagList.refetch()} />}
      {mobile && budgetPanel}
      <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Tabs label="Transfer sekmeleri" idPrefix={PREFIX} value={tab} tabs={tabs} onChange={setTab} />

          {/* REVIEW Y6: öneri sonucu (kredi düşer) Kısa liste/Satış sekmesine geçince kaybolmasın. */}
          <TabPanel idPrefix={PREFIX} id="adaylar" active={tab === 'adaylar'} keepMounted>
            <div className="flex flex-col gap-3">
      <Section title="İhtiyaçlar" actions={(
        <span className="flex flex-wrap items-center gap-2">
          {main.source?.kind === 'auto' && <SourceTag source={main.source} />}
          <Chip pressed={allSquad} onClick={() => set({ kadro: allSquad ? undefined : 'tum', ihtiyac: undefined })}>Tüm kadro</Chip>
          <HelpPopover label="İhtiyaçlar">Masa'daki zayıf halka kuralı: ana taktikte (yoksa başlangıç önerisinde) rozeti sarı ya da kırmızı olan ve seviyesinde oynayan slotlar, en zayıf başta. Derinlik açıkları da gelir.</HelpPopover>
        </span>
      )}>
        {needs.length === 0 ? (
          <EmptyState>{fitsPending ? 'Hesaplanıyor…' : allSquad ? 'Dizilimde oyuncu yok.' : 'Zayıf halka yok: dizilimdeki herkes seviyesinde ya da üstünde.'}</EmptyState>
        ) : (
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 max-sm:snap-x">
            {needs.map((n) => (
              <li key={n.key} className="shrink-0 snap-start">
                <button type="button" aria-pressed={need?.key === n.key} onClick={() => set({ ihtiyac: n.key, pos: undefined, rol: undefined, role: undefined })}
                  className={`flex min-h-11 flex-col items-start gap-0.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-left text-sm ${need?.key === n.key ? 'border-accent bg-[var(--glass-press)] shadow-[inset_0_-2px_0_var(--accent)]' : 'border-[var(--glass-border)] glass-3 hover:bg-[var(--glass-hover)]'}`}>
                  <span className="flex items-center gap-2 whitespace-nowrap font-semibold">{n.label}{n.state && <FitBadge state={n.state} compact />}</span>
                  <span className="whitespace-nowrap text-xs text-ink-2">{n.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

        <Section title={need ? `Adaylar · ${need.label}` : 'Adaylar'}>
          {need ? (
            <RecommendationPanel
              key={need.key}
              careerId={id}
              position={need.position}
              slotId={need.slotId}
              roleId={need.roleId}
              cardWidth={mobile ? CANDIDATE_CARD_MOBILE : CANDIDATE_CARD}
              longShots={longShots}
              onLongShotsChange={(v) => set({ uzak: v ? '1' : undefined })}
              longShotsLabel="Uzak ihtimalleri göster"
              rowExtra={(item) => <CandidateExtra item={item} budget={budget} leagueOvr={facets.data?.leagueOvr} />}
              rowAction={(item: CareerRecommendationItem) => <ShortlistButton careerId={id!} playerId={item.player.id} note={need.label} />}
            />
          ) : (
            <EmptyState action={!allSquad ? <Button onClick={() => set({ kadro: 'tum', ihtiyac: undefined })}>Tüm kadroyu göster</Button> : undefined}>
              {allSquad ? 'Dizilimde oyuncu yok.' : 'Zayıf halka yok. Bir mevkiye aday aramak için tüm kadroyu göster.'}
            </EmptyState>
          )}
        </Section>
            </div>
          </TabPanel>

          <TabPanel idPrefix={PREFIX} id="kisa-liste" active={tab === 'kisa-liste'}>
        <Section title={`Kısa liste (${items.length})`}>
          {items.length === 0 ? <EmptyState>Adaylardan, Oyuncular listesinden, Wonderkids'ten ya da oyuncu sayfasından kısa listeye ekle; pazarlık tavanını burada yaz.</EmptyState> : (
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
                Toplam <b className={`${NUM} text-ink`}>{plan.shortlist.count - plan.shortlist.unknown === 0 ? '—' : formatEur(plan.shortlist.total)}</b>
                {after !== undefined && <> · alım sonrası bütçe <b className={`${NUM} ${after < 0 ? 'text-bad' : 'text-ink'}`}>{formatEur(after)}</b></>}
              </p>
            </>
          )}
        </Section>
          </TabPanel>

          <TabPanel idPrefix={PREFIX} id="satis" active={tab === 'satis'}>
            <Section title="Satış planı">
              {squad.isLoading ? <Skeleton className="h-48" /> : (
                <SellPlanTab careerId={id!} squad={squad.data ?? []} tags={tagList.data ?? []} starters={starters} gameDate={gameDate} focusId={focusId} />
              )}
            </Section>
          </TabPanel>
        </div>
        {!mobile && <aside className="min-[1024px]:sticky min-[1024px]:top-24 min-[1024px]:w-[320px] min-[1024px]:shrink-0">{budgetPanel}</aside>}
      </div>
    </div>
  )
}
