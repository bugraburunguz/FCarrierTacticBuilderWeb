import { useQuery } from '@tanstack/react-query'
import { Check, CircleHelp, Copy, Lock, Timer, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import { useAuth } from '../../auth/AuthContext'
import type { SbcChallenge } from '../../api/types'
import { SbcVote, useSbcVotes } from '../../components/SbcVote'
import { Input } from '../../components/ui'
import { Workspace } from '../../design/components/Workspace'
import { Button, EmptyState, ErrorState, Segmented, SidePanel, Skeleton } from '../../design/components/primitives'
import { describeRequirement } from '../../lib/sbcChallenge'
import { isItemScore, isSingleItem } from '../../lib/kbSbc'
import { CardName } from '../../components/card/CardName'
import { singleItemCandidates, type SingleItemPlan } from './solve/singleItem'

const SINGLE_ITEM_LIMIT = 30
import { SolutionPitch } from '../squad/SolutionPitch'
import { DEFAULT_CUSTOMIZE, type Customize, type PlanCandidate } from './solve/candidates'
import { lockIssues, parseLockParam, type LockIssue } from './solve/lockParam'
import { requirementStatuses, type RequirementStatus } from './solve/requirementStatus'
import { coins, shoppingList, shoppingText } from './solve/shoppingList'
import { useActiveSquadCards, useClubCards, useScorePlan, useSbcSet, useSquadPlan } from './solve/useSolvePlan'
import { countdownText } from './sbcList'

const STATUS_TEXT: Record<string, string> = { COMPLETED: 'Tamamlandı' }
const statusText = (c: SbcChallenge) => STATUS_TEXT[c.status ?? ''] ?? 'Açık'

/** Gereksinim çipi: ✓ sağlanıyor / ✗ sağlanmıyor (üstüne gelince ya da dokununca sebep) / ? doğrulanamadı. */
function RequirementChip({ status }: { status: RequirementStatus }) {
  const reasonId = useId()
  const [open, setOpen] = useState(false)
  const text = describeRequirement(status.requirement)
  const icon = status.state === 'ok' ? <Check size={14} aria-hidden="true" className="text-good" /> : status.state === 'fail' ? <X size={14} aria-hidden="true" className="text-bad" /> : <CircleHelp size={14} aria-hidden="true" className="text-muted" />
  const stateText = status.state === 'ok' ? 'sağlanıyor' : status.state === 'fail' ? 'sağlanmıyor' : 'doğrulanamadı'
  const base = 'glass-3 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3 text-xs font-medium text-ink max-sm:min-h-11'
  return (
    <li data-state={status.state} className="group relative">
      {status.reason ? (
        <button type="button" className={base} aria-label={`${text}: ${stateText}`} aria-describedby={reasonId} aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)}>
          {icon}<span>{text}</span>
        </button>
      ) : (
        <span className={base}>{icon}<span>{text}</span><span className="sr-only">: {stateText}</span></span>
      )}
      {status.reason && (
        <span id={reasonId} role="tooltip" className={`absolute left-0 top-full z-30 mt-1 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow ${open ? 'block' : 'hidden group-hover:block group-focus-within:block'}`}>
          {status.reason}
        </span>
      )}
    </li>
  )
}

function ShoppingPanel({ title, picks }: { title: string; picks: (PlanCandidate | undefined)[] }) {
  const list = shoppingList(picks)
  const [copied, setCopied] = useState(false)
  return (
    <>
      <section aria-label="Alışveriş listesi" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold">Alışveriş listesi</h2>
          {list.buy.length > 0 && (
            <Button onClick={() => navigator.clipboard?.writeText(shoppingText(title, list)).then(() => setCopied(true))} className="gap-1.5">
              <Copy size={14} aria-hidden="true" />Kopyala
            </Button>
          )}
        </div>
        {/* V3-05d-c: alınacak kart yoksa yalnız bu satır (Toplam 0 yazılmaz). */}
        {list.buy.length === 0 && <p className="text-sm text-ink-2">Alınacak kart yok</p>}
        {list.buy.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {list.buy.map((p) => (
              <li key={p.cardKey} className="flex items-baseline justify-between gap-2 border-b border-[var(--glass-border)] py-1">
                <span className="min-w-0 truncate">{p.name} <span className="num text-xs text-ink-2">{p.overall} · {p.positions[0]}</span></span>
                <span className={`num shrink-0 ${p.knownPrice === undefined ? 'text-xs text-ink-2' : ''}`}>{p.knownPrice !== undefined ? coins(p.knownPrice) : 'fiyat yok'}</span>
              </li>
            ))}
          </ul>
        )}
        {list.buy.length > 0 && (
          <p className="text-sm">
            Toplam <span className="num font-semibold">{coins(list.knownTotal)}</span>
            {list.unknownCount > 0 && <span className="text-ink-2"> · {list.unknownCount} kartın fiyatı bilinmiyor</span>}
          </p>
        )}
        {copied && <p role="status" className="text-xs text-ink-2">Liste panoya kopyalandı.</p>}
      </section>
      {/* V3-05d-c: değer vekili gösterilmez; yalnız sayı ve kullanılan en yüksek reyting. */}
      <p className="text-sm">Kulüpten kullanılan: <span className="num font-semibold">{list.club.length}</span> kart{list.club.length > 0 ? ` · En değerli: ${Math.max(...list.club.map((p) => p.overall))}` : ''}</p>
    </>
  )
}

/** Kulüpten kilitli istenen ama uygulanamayan kartlar ve sebebi (V3-07c). */
function LockIssues({ issues }: { issues: LockIssue[] }) {
  if (issues.length === 0) {
    return null
  }
  return (
    <div role="status" className="flex flex-col gap-1 text-sm">
      <p className="font-semibold">Uygulanamayan kartlar ({issues.length})</p>
      <ul aria-label="Uygulanamayan kartlar" className="list-disc pl-4 text-ink-2">
        {issues.map((i) => <li key={i.key}>{i.name ?? 'Bilinmeyen kart'}: {i.reason}</li>)}
      </ul>
    </div>
  )
}

function CustomizePanel({ customize, set, picks, open }: { customize: Customize; set: (c: Customize) => void; picks: (PlanCandidate | undefined)[]; open?: boolean }) {
  const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key])
  const cards = picks.filter((p): p is PlanCandidate => Boolean(p))
  return (
    <details className="text-sm" open={open}>
      <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent">Özelleştir</summary>
      <div className="flex flex-col gap-3 pt-2">
        {/* V3-06b/0: varsayılan "Önce kulüp" — kulüp yetiyorsa satın alma yok; diğeri toplam değeri en aza indirir. */}
        <Segmented label="Amaç" value={customize.mode} onChange={(mode) => set({ ...customize, mode })}
          options={[{ id: 'club-first', label: 'Önce kulüp' }, { id: 'min-value', label: 'Toplam değeri en aza indir' }]} />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Koruma eşiği (reyting)
          <Input type="number" min={50} max={99} inputMode="numeric" value={customize.protectRatingFrom}
            onChange={(e) => e.target.value !== '' && set({ ...customize, protectRatingFrom: Number(e.target.value) })} />
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={customize.onlyClub} onChange={(e) => set({ ...customize, onlyClub: e.target.checked })} />
          Yalnız kulüp
        </label>
        <label className="inline-flex min-h-10 items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={customize.protectSpecial} onChange={(e) => set({ ...customize, protectSpecial: e.target.checked })} />
          Özel kartları koru
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Bütçe üst sınırı
          <Input type="number" min={0} step={500} inputMode="numeric" placeholder="Sınır yok" value={customize.budget ?? ''}
            onChange={(e) => set({ ...customize, budget: e.target.value === '' ? undefined : Number(e.target.value) })} />
        </label>
        {cards.length > 0 && (
          <ul aria-label="Kadrodaki kartlar" className="flex flex-col gap-1">
            {cards.map((p) => (
              <li key={p.cardKey} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{p.locked && <Lock size={12} aria-label="Kilitli" className="mr-1 inline" />}<CardName assetId={p.assetId} name={p.name} position={p.positions[0]} rating={p.overall} /> <span className="num text-xs text-ink-2">{p.overall}</span></span>
                <span className="flex shrink-0 gap-1">
                  <Button className="min-h-8 px-2 text-xs" aria-pressed={customize.locked.includes(p.cardKey)} onClick={() => set({ ...customize, locked: toggle(customize.locked, p.cardKey) })}>Kilitle</Button>
                  <Button className="min-h-8 px-2 text-xs" onClick={() => set({ ...customize, excluded: [...customize.excluded, p.cardKey], locked: customize.locked.filter((k) => k !== p.cardKey) })}>Hariç tut</Button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {customize.excluded.length > 0 && (
          <Button className="self-start text-xs" onClick={() => set({ ...customize, excluded: [] })}>Hariç tutulanları geri al ({customize.excluded.length})</Button>
        )}
      </div>
    </details>
  )
}

function ScoreView({ challenge }: { challenge: SbcChallenge }) {
  const { authenticated } = useAuth()
  const plan = useScorePlan(challenge, authenticated)
  const club = useClubCards()
  const target = challenge.pointsRequired ?? 0
  if (!authenticated) {
    return <EmptyState action={<Link to="/login" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--glass-border)] px-4 text-sm font-semibold text-ink">Giriş yap</Link>}>Skor tabanlı görevin planı için giriş yap.</EmptyState>
  }
  if (club.length === 0) {
    return <EmptyState action={<Link to="/ut/import" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--glass-border)] px-4 text-sm font-semibold text-ink">Kulübünü senkronla</Link>}>Skor planı kulüp kartlarından hesaplanır; kulübün boş.</EmptyState>
  }
  if (plan.isLoading) return <Skeleton className="h-40" />
  if (plan.isError) return <ErrorState message="Skor planı hesaplanamadı." onRetry={() => plan.refetch()} />
  const result = plan.data
  const current = result?.totalScore ?? 0
  return (
    <section aria-label="Skor planı" className="glass flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between text-sm"><span>Hedef <span className="num font-semibold">{coins(target)}</span></span><span>Mevcut <span className="num font-semibold">{coins(current)}</span></span></div>
      <div role="progressbar" aria-label="SBC skoru" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current} className="h-3 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${current >= target ? 'bg-good' : 'bg-warn'}`} style={{ width: `${target > 0 ? Math.min(100, (current / target) * 100) : 0}%` }} />
      </div>
      {result && !result.feasible && <p role="alert" className="text-sm text-bad">{result.note ?? 'Kulüp kartlarıyla hedefe ulaşılamıyor.'}</p>}
      {result?.feasible && (
        <ul aria-label="Kullanılacak kartlar" className="flex flex-col gap-1 text-sm">
          {result.picks.map((p, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-[var(--glass-border)] py-1">
              <span><span className="num font-semibold">{p.rating}</span> · {p.count} kart{p.untradeable ? ' · takas edilemez' : ''}</span>
              <span className="num">{coins(p.totalScore)} puan</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-2">Skor tablosu kurallardan; görev kısmen gönderilebilir, eksik puanı oyunda tamamla (WEB-BUG-04).</p>
    </section>
  )
}

/**
 * V3-05d-b — tek kart teslimi (EA ONE_CLICK_CHALLENGE): saha yok. Şartlar tek kartın verisinden ölçülebiliyorsa uygun kulüp kartları,
 * ölçülemiyorsa "Elle kontrol et" + kısa açıklama. EA'nın görevdeki puan değeri gösterilir, anlamı doğrulanmadı.
 */
function SingleItemView({ challenge, plan }: { challenge: SbcChallenge; plan: SingleItemPlan }) {
  return (
    <section aria-labelledby="single-title" className="glass flex flex-col gap-3 p-4">
      <h2 id="single-title" className="font-display text-xl font-semibold">Tek kart teslimi</h2>
      <p className="text-sm text-ink-2">Bu görevde kadro kurulmaz; şartlara uyan tek bir kartı oyunda teslim edersin.</p>
      {challenge.pointsRequired !== undefined && (
        <p className="text-xs text-ink-2">EA görev değeri: <span className="num">{coins(challenge.pointsRequired)}</span> (anlamı doğrulanmadı)</p>
      )}
      {!plan.evaluable ? (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold">Elle kontrol et</p>
          <p className="text-ink-2">Şartlar ({plan.unverified.map((r) => describeRequirement(r)).join(' · ') || 'şart yok'}) kart verisinden doğrulanamıyor; uygun kartı oyunda seç.</p>
        </div>
      ) : plan.cards.length === 0 ? (
        <p className="text-sm text-ink-2">Kulübünde şartlara uyan kart yok.</p>
      ) : (
        <ul aria-label="Uygun kulüp kartları" className="flex flex-col gap-1 text-sm">
          {plan.cards.slice(0, SINGLE_ITEM_LIMIT).map((c) => (
            <li key={c.key} className="flex justify-between gap-2 border-b border-[var(--glass-border)] py-1">
              <span className="min-w-0 truncate"><CardName assetId={c.assetId} name={c.name} position={c.positions[0]} rating={c.rating} /> <span className="num text-xs text-ink-2">{c.rating} · {c.positions[0]}</span></span>
              <span className="shrink-0 text-xs text-ink-2">{c.untradeable ? 'takas edilemez' : 'takas edilebilir'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Tek kart görevinde çip durumu: ölçülemeyen ? ; ölçülebilen, uygun kart varsa ✓ yoksa ✗. */
function singleStatuses(challenge: SbcChallenge, plan: SingleItemPlan): RequirementStatus[] {
  return challenge.requirements.map((r) => plan.unverified.includes(r)
    ? { requirement: r, state: 'unknown' as const, reason: 'Kart verisinden doğrulanamıyor' }
    : plan.cards.length > 0 ? { requirement: r, state: 'ok' as const } : { requirement: r, state: 'fail' as const, reason: 'Uygun kulüp kartı yok' })
}

/**
 * SBC çözüm sayfası (/ut/sbc/:setId/:challengeId, 08 §5, Detay şablonu). Yalnız PLAN gösterir: EA'ya istek yok, gönderme/otomatik tamamlama yok;
 * kullanıcı oyunda kendisi yapar. Kahraman çözüm sahası (kadro çekirdeği), yanda alışveriş listesi, kulüp kullanımı ve Özelleştir.
 */
export function SbcSolvePage() {
  const params = useParams()
  const [search] = useSearchParams()
  const setId = Number(params.setId)
  const { set, loading, error } = useSbcSet(setId)
  const challenge = set.challenges.find((c) => String(c.challengeId) === params.challengeId)
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  // V3-07c: kulüpten "Şu SBC'de kullan" seçili kartları ?kilit= ile kilitli getirir.
  const [requestedLocks] = useState(() => parseLockParam(search))
  const [customize, setCustomize] = useState<Customize>(() => ({ ...DEFAULT_CUSTOMIZE, locked: requestedLocks }))
  const score = challenge ? isItemScore(challenge) : false
  const single = challenge ? isSingleItem(challenge) : false
  const plan = useSquadPlan(score || single ? undefined : challenge, formations.data, customize)
  const club = useClubCards()
  const activeSquad = useActiveSquadCards()
  const singlePlan = useMemo(() => (challenge && single ? singleItemCandidates(challenge.requirements, club) : undefined), [challenge, single, club])
  const votes = useSbcVotes()
  const now = useMemo(() => Date.now(), [])
  const countdown = countdownText(set.endsAt, now)
  const title = `${set.name ?? 'SBC'} · ${challenge?.name ?? ''}`
  const statuses = challenge && singlePlan ? singleStatuses(challenge, singlePlan)
    : challenge && plan.data ? requirementStatuses(challenge.requirements, plan.data.picks, plan.data.slots) : undefined
  const clubEmpty = club.length === 0

  if (loading) {
    return <div className="flex flex-col gap-3 py-2"><Skeleton className="h-10" /><Skeleton className="h-[480px]" /></div>
  }
  if (!params.challengeId && set.challenges.length > 0) {
    const first = set.challenges.find((c) => c.status !== 'COMPLETED') ?? set.challenges[0]
    return <Navigate to={`/ut/sbc/${setId}/${first.challengeId}`} replace />
  }
  if (error || !challenge) {
    return (
      <EmptyState action={<Link to="/ut/sbc" className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[var(--glass-border)] px-4 text-sm font-semibold text-ink">SBC listesine dön</Link>}>
        Bu görevin şartları bilgi tabanında yok. Uzantı açıkken Web App'te bu seti aç; sonra İçe aktar'dan senkronla.
      </EmptyState>
    )
  }

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/ut/sbc" className="text-sm text-ink-2 underline">← SBC listesi</Link>
        <div className="flex items-center gap-3">
          {countdown && <span className="inline-flex items-center gap-1 text-xs text-ink-2"><Timer size={14} aria-hidden="true" />{countdown}</span>}
          <SbcVote setId={setId} votes={votes.get(setId)} />
        </div>
      </div>
      <h1 className="font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">{set.name ?? 'SBC'}</h1>
      <nav aria-label="Görevler" className="flex gap-1.5 overflow-x-auto pb-1">
        {set.challenges.map((c) => {
          const active = c.challengeId === challenge.challengeId
          return (
            <Link key={c.challengeId} to={`/ut/sbc/${setId}/${c.challengeId}`} aria-current={active ? 'page' : undefined}
              className={`glass-3 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium max-sm:min-h-11 ${active ? 'border-accent text-ink' : 'border-[var(--glass-border)] text-ink-2'}`}>
              {c.name}<span className="text-ink-2">· {statusText(c)}</span>
            </Link>
          )
        })}
      </nav>
      {!score && (
        <ul aria-label="Gereksinimler" className="flex flex-wrap gap-1.5">
          {(statuses ?? challenge.requirements.map((r) => ({ requirement: r, state: 'unknown' as const }))).map((s, i) => <RequirementChip key={i} status={s} />)}
        </ul>
      )}
      {clubEmpty && !score && !single && (
        <p className="text-sm text-ink-2">Kulüp kartın yok; plan katalogdan. <Link to="/ut/import" className="font-semibold text-accent underline">Kulübünü senkronla</Link></p>
      )}
    </div>
  )

  if (score) {
    return <div className="flex flex-col gap-4 py-2">{header}<ScoreView challenge={challenge} /></div>
  }
  if (single && singlePlan) {
    return <div className="flex flex-col gap-4 py-2">{header}<SingleItemView challenge={challenge} plan={singlePlan} /></div>
  }

  const result = plan.data
  return (
    <div className="py-2">
      <Workspace
        title={title}
        header={header}
        hero={plan.isLoading || formations.isLoading ? <Skeleton className="h-[480px]" />
          : plan.isError || formations.isError ? <ErrorState message="Çözüm hesaplanamadı." onRetry={() => plan.refetch()} />
          : result ? <SolutionPitch slots={result.slots} picks={result.picks} />
          : <EmptyState>{challenge.formation && /^f\d/.test(challenge.formation) ? `Formasyon tanınmadı (${challenge.formation})` : 'Bu görevin dizilişi bilgi tabanında yok.'}</EmptyState>}
        side={
          <SidePanel title="Plan">
            {result ? (
              <div className="flex flex-col gap-4" data-solve-ms={result.elapsedMs}>
                {!result.feasible && (
                  <div role="alert" className="flex flex-col gap-1 text-sm">
                    <p className="font-semibold text-bad">Çözüm bulunamadı</p>
                    <ul aria-label="Tıkayan şartlar" className="list-disc pl-4 text-ink-2">{result.blocking.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                )}
                <ShoppingPanel title={title} picks={result.picks} />
                {result.notes.length > 0 && <p className="text-xs text-ink-2">Elle kontrol et: {result.notes.join(' · ')}</p>}
                <CustomizePanel customize={customize} set={setCustomize} picks={result.picks} open={requestedLocks.length > 0} />
                {requestedLocks.length > 0 && <LockIssues issues={lockIssues(requestedLocks.filter((k) => customize.locked.includes(k)), club, result.picks.filter((p): p is PlanCandidate => Boolean(p)), activeSquad)} />}
                <p className="text-xs text-ink-2">Plan yalnız öneridir; görevi oyunda kendin gönder.</p>
              </div>
            ) : <Skeleton className="h-40" />}
          </SidePanel>
        }
      />
    </div>
  )
}
