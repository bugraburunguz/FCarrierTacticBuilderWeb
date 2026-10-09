import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { endpoints } from '../api/endpoints'
import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSolution } from '../lib/sbcTraditional'
import { squadChemistry } from '../lib/chemistry'
import { parseXiText } from '../lib/objectives'
import type { LookupItem, PageResponse, PlayerSummary, SbcChallenge } from '../api/types'
import { challengeSetup } from '../lib/sbcChallenge'
import { Pitch } from './squadBuilder/Pitch'
import type { SlotView } from './squadBuilder/PositionCard'
import { swapSlots } from '../lib/squadBuilder'
import { teamRating } from '../lib/sbcTraditional'
import { estimateCoinPrice } from '../lib/coinPrice'
import { ownedCost, ownedSource } from '../lib/sbcPriority'
import { useUtCapture } from '../state/utCaptureStore'
import { utCardStore } from '../state/utCardStore'
import { Button, Card, ErrorBox, Field, Input, Pill, Select } from './ui'

const POOL_SPREAD_DOWN = 8
const POOL_SPREAD_UP = 6
const CLUB_ID_BASE = 1_000_000_000

type PoolMode = 'auto' | 'owned' | 'market'
const MODE_LABEL: Record<PoolMode, string> = { auto: 'Önerilen: Storage → Kadro → Market', owned: 'Yalnız kulüp ve storage (parasız)', market: 'Yalnız market (en ucuz)' }

function shortCoins(value: number): string {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)
}

async function fromAnyPages(r: NonNullable<SbcConstraints['fromAny']>[number], leagues: LookupItem[], nations: LookupItem[], positions: string[], ovrMin: number, min: number): Promise<PageResponse<PlayerSummary>[]> {
  const ovrMax = min + POOL_SPREAD_UP + 6
  if (r.kind === 'club') {
    const clubs = await Promise.all(r.names.map((name) => endpoints.clubs(name, { limit: 1, gender: 0 })))
    return Promise.all(clubs.flatMap((hit) => hit.slice(0, 1)).map((club) => endpoints.players({ club: club.id, ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order: 'desc', size: 60, gender: 0 })))
  }
  const list = r.kind === 'league' ? leagues : nations
  const ids = r.names.flatMap((name) => list.filter((l) => l.name.toLowerCase() === name.toLowerCase()).map((l) => l.id))
  return Promise.all(
    ids.flatMap((id) => positions.map((pos) => endpoints.players({ pos: [pos], ...(r.kind === 'league' ? { league: id } : { nat: id }), ovr_min: ovrMin, ovr_max: ovrMax, sort: 'overall', order: 'desc', size: 40, gender: 0 }))),
  )
}

function resolveNames(wanted: Record<string, number>, list: LookupItem[]): { id: number; name: string; count: number }[] {
  return Object.entries(wanted).flatMap(([name, count]) => {
    const hit = list.find((l) => l.name.toLowerCase() === name.toLowerCase()) ?? list.find((l) => l.name.toLowerCase().includes(name.toLowerCase()))
    return hit ? [{ id: hit.id, name: hit.name, count }] : []
  })
}

export function TraditionalSbc({ challenge, autoRun = false }: { challenge?: SbcChallenge; autoRun?: boolean }) {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const setup = useMemo(() => (challenge && formations.data ? challengeSetup(challenge, formations.data) : undefined), [challenge, formations.data])
  const [formationId, setFormationId] = useState('4-4-2')
  const [rating, setRating] = useState(challenge ? '' : '80')
  const [chem, setChem] = useState(challenge ? '' : '20')
  const [sameLeague, setSameLeague] = useState('')
  const [sameNation, setSameNation] = useState('')
  const [sameClub, setSameClub] = useState('')
  const [xiText, setXiText] = useState('')
  const formation = formations.data?.find((f) => f.id === formationId) ?? formations.data?.[0]
  const [picks, setPicks] = useState<(SbcCandidate | undefined)[]>([])
  const [applied, setApplied] = useState<SbcChallenge>()
  if (challenge && setup && applied !== challenge) {
    setApplied(challenge)
    setFormationId(setup.formationId ?? formationId)
    setRating(String(setup.teamRatingMin || ''))
    setChem(String(setup.chemMin || ''))
    setPicks([])
  }
  const capture = useUtCapture()
  const [skipStarters, setSkipStarters] = useState(true)
  const allOwned = useMemo(() => (utCardStore.get()?.cards ?? []).filter((c) => c.source === 'club'), [])
  const starterIds = useMemo(() => new Set((capture?.activeSquad?.slots ?? []).filter((s) => s.card).map((s) => s.card!.instanceId)), [capture])
  const clubCards = useMemo(() => allOwned.filter((c) => !(skipStarters && c.instanceId !== undefined && starterIds.has(c.instanceId))), [allOwned, skipStarters, starterIds])
  const [mode, setMode] = useState<PoolMode>(allOwned.length > 0 ? 'auto' : 'market')

  const solve = useMutation({
    onSuccess: (r) => setPicks(r.picks),
    mutationFn: async (): Promise<SbcSolution> => {
      const slots = formation!.slots.map((s) => ({ slotId: s.slotId, position: s.position }))
      const min = Number(rating) || 0
      const extra = setup?.extra ?? {}
      const qualityFloor = extra.minQuality === 3 ? 75 : extra.minQuality === 2 ? 65 : 0
      const ovrMin = Math.max(min - POOL_SPREAD_DOWN, qualityFloor, 45)
      const positions = [...new Set(slots.map((s) => s.position))]
      const useMarket = mode !== 'owned'
      const pages = useMarket
        ? await Promise.all(
            positions.map((pos) => endpoints.players({ pos: [pos], ovr_min: ovrMin, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 100, gender: 0 })),
          )
        : []
      const xi = parseXiText(xiText)
      const [leagueList, nationList] = await Promise.all([endpoints.leagues(0), endpoints.nationalities()])
      const leagueRequired = resolveNames(xi.league, leagueList)
      const nationRequired = resolveNames(xi.nationality, nationList)
      const extraPages = useMarket ? await Promise.all([
        ...leagueRequired.flatMap((r) => positions.map((pos) => endpoints.players({ pos: [pos], league: r.id, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 40, gender: 0 }))),
        ...nationRequired.flatMap((r) => positions.map((pos) => endpoints.players({ pos: [pos], nat: r.id, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 40, gender: 0 }))),
      ]) : []
      const fromPages = useMarket ? (await Promise.all((extra.fromAny ?? []).map((r) => fromAnyPages(r, leagueList, nationList, positions, ovrMin, min)))).flat() : []
      const byId = new Map<number, SbcCandidate>()
      pages.concat(extraPages, fromPages).flatMap((p) => p.items).forEach((p) =>
        byId.set(p.id, { id: p.id, name: p.name, overall: p.overall, club: p.club, league: p.league, nationality: p.nationality, gender: p.gender, positions: p.positions, price: estimateCoinPrice(p.overall), source: 'market', faceUrl: p.faceUrl }),
      )
      if (mode !== 'market') {
        clubCards.forEach((c, i) =>
          byId.set(CLUB_ID_BASE + i, { id: CLUB_ID_BASE + i, name: c.name, overall: c.rating, club: c.club, league: c.league, nationality: c.nationality, gender: c.gender, positions: c.positions, cardType: c.cardType, price: ownedCost(c), source: ownedSource(c), faceUrl: c.faceUrl, rarity: c.rarity }),
        )
      }
      const required = {
        league: Object.fromEntries(leagueRequired.map((r) => [r.name, r.count])),
        nationality: Object.fromEntries(nationRequired.map((r) => [r.name, r.count])),
        club: xi.club,
      }
      const constraints: SbcConstraints = {
        required,
        teamRatingMin: min,
        chemMin: Number(chem) || 0,
        minSameLeague: sameLeague ? Number(sameLeague) : undefined,
        minSameNation: sameNation ? Number(sameNation) : undefined,
        minSameClub: sameClub ? Number(sameClub) : undefined,
        ...extra,
        ...(sameLeague ? { minSameLeague: Number(sameLeague) } : {}),
        ...(sameNation ? { minSameNation: Number(sameNation) } : {}),
        ...(sameClub ? { minSameClub: Number(sameClub) } : {}),
      }
      return solveTraditional(slots, [...byId.values()], constraints)
    },
  })
  const autoStarted = useRef<SbcChallenge | undefined>(undefined)
  const ready = Boolean(autoRun && challenge && setup && applied === challenge && formation && (!setup.formationId || formation.id === setup.formationId))
  useEffect(() => {
    if (ready && autoStarted.current !== challenge) {
      autoStarted.current = challenge
      solve.mutate()
    }
  }, [ready, challenge, solve])
  const result = solve.data
  const slots = formation?.slots ?? []
  const shown = result ? slots.map((_, i) => picks[i]) : []
  const chemResult = result ? squadChemistry(slots.map((s, i) => ({ position: s.position, card: shown[i] }))) : undefined
  const filled = shown.filter((p): p is SbcCandidate => Boolean(p))
  const views: SlotView[] = slots.map((s, i) => {
    const p = shown[i]
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      player: p && { id: p.id, name: p.name, overall: p.overall },
      fut: p && { faceUrl: p.faceUrl, cardType: p.cardType, rarity: p.rarity, nationality: p.nationality, club: p.club, league: p.league },
      roleLabel: '',
      sub: p ? `kimya ${chemResult!.perSlot[i]} · ${p.source === 'storage' ? 'Storage' : p.source === 'club' ? 'Kulüp' : `~${shortCoins(p.price ?? 0)}`}` : undefined,
    }
  })
  function swap(from: string, to: string) {
    const a = slots.findIndex((s) => s.slotId === from)
    const b = slots.findIndex((s) => s.slotId === to)
    const byId = swapSlots(Object.fromEntries(picks.map((p, i) => [String(i), p]).filter(([, p]) => p) as [string, SbcCandidate][]), String(a), String(b))
    setPicks(slots.map((_, i) => byId[String(i)]))
  }

  return (
    <Card title="SBC çözücü (squad kurma tipi)">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Takım rating'i, kimya ve oyuncu sayısı şartlarını sağlayan 11'i arar. Fiyat verisi olmadığı için "en ucuz" yerine en düşük toplam rating'li çözüm aranır; havuz katalogdaki temel kartlardır (kulüp havuzu henüz yok).
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Formasyon">
          <Select value={formation?.id} onChange={(e) => setFormationId(e.target.value)}>
            {(formations.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
            ))}
          </Select>
        </Field>
        <Field label="Min takım rating"><Input type="number" min={50} max={95} value={rating} onChange={(e) => setRating(e.target.value)} /></Field>
        <Field label="Min kimya"><Input type="number" min={0} max={33} value={chem} onChange={(e) => setChem(e.target.value)} /></Field>
        <Field label="Aynı ligden min"><Input type="number" min={0} max={11} value={sameLeague} onChange={(e) => setSameLeague(e.target.value)} /></Field>
        <Field label="Aynı ülkeden min"><Input type="number" min={0} max={11} value={sameNation} onChange={(e) => setSameNation(e.target.value)} /></Field>
        <Field label="Aynı kulüpten min"><Input type="number" min={0} max={11} value={sameClub} onChange={(e) => setSameClub(e.target.value)} /></Field>
      </div>
      <div className="mt-3">
        <Field label="XI şartları (isteğe bağlı)">
          <Input value={xiText} onChange={(e) => setXiText(e.target.value)} placeholder="lig:Premier League=1; ülke:Brazil=2" className="font-mono" />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label="Kart havuzu">
          <Select value={mode} onChange={(e) => setMode(e.target.value as PoolMode)}>
            {(Object.keys(MODE_LABEL) as PoolMode[]).map((m) => (
              <option key={m} value={m} disabled={m !== 'market' && allOwned.length === 0}>
                {MODE_LABEL[m]}{m !== 'market' && allOwned.length === 0 ? ' — önce kulüp içe aktar' : ''}
              </option>
            ))}
          </Select>
        </Field>
        <p className="max-w-md text-xs text-muted">
          {allOwned.length > 0 ? `Elinde ${allOwned.filter((c) => c.pile === 'storage').length} storage, ${allOwned.length} toplam kart var. ` : 'Giriş yapıp Kulüp içe aktar ile kartlarını yüklersen storage ve kulüp havuzunu da kullanabilirsin. '}
          Storage ve duplicate kartlar bedava sayılır; kadrodaki kart satış değeri kadar maliyetlidir (10K'lık kartı vermek yerine daha ucuz market kartı varsa o seçilir). Market maliyeti rating başına tahmini coin'dir.
        </p>
      </div>
      {starterIds.size > 0 && (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={skipStarters} onChange={(e) => setSkipStarters(e.target.checked)} />
          Aktif kadrodaki oyuncuları (ilk 11 + yedekler) kullanma
        </label>
      )}
      <Button className="mt-3" disabled={!formation || solve.isPending} onClick={() => solve.mutate()}>{solve.isPending ? 'Aranıyor…' : 'Çöz'}</Button>
      {solve.error && <ErrorBox error={solve.error} />}
      {result && (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(260px,420px)_1fr]">
          <div className="rounded-2xl border border-line bg-surface p-2.5">
            <Pitch slots={views} onPickPlayer={() => undefined} onPickRole={() => undefined} onSwap={swap} />
            <p className="mt-2 px-1 text-xs text-muted">Oyuncuyu başka bir karta sürükle: yer değiştirirler (kimya yeniden hesaplanır).</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone={result.feasible ? 'emerald' : 'rose'}>{result.feasible ? 'Şartlar sağlandı' : 'Şartlar sağlanamadı'}</Pill>
              <Pill tone="sky">rating {filled.length === slots.length ? teamRating(filled.map((p) => p.overall)) : result.teamRating}</Pill>
              <Pill tone="sky">kimya {chemResult ? chemResult.total : result.chemistry}</Pill>
            </div>
            {result.violations.map((v) => (
              <p key={v} className="text-rose-600 dark:text-rose-400">{v}</p>
            ))}
            <CostSummary picks={filled} />
            <p className="text-xs text-slate-500">Arama yaklaşıktır (beam search); şart sağlanamadıysa havuz ya da şartlar gevşetilebilir.</p>
          </div>
        </div>
      )}
    </Card>
  )
}

function CostSummary({ picks }: { picks: SbcCandidate[] }) {
  const storage = picks.filter((p) => p.source === 'storage')
  const club = picks.filter((p) => p.source === 'club')
  const market = picks.filter((p) => p.source === 'market')
  const total = market.reduce((sum, p) => sum + (p.price ?? 0), 0)
  const sacrificed = Math.round(club.reduce((sum, p) => sum + (p.price ?? 0), 0))
  return (
    <div className="space-y-1 rounded-lg border border-line bg-surface-2 p-2 text-xs">
      <p>
        <b>Storage:</b> {storage.length} kart (bedava) · <b>Kadro:</b> {club.length} kart (feda edilen değer ~{sacrificed.toLocaleString('tr-TR')}) · <b>Market:</b> {market.length} kart · harcanacak ~<b>{total.toLocaleString('tr-TR')}</b> coin
      </p>
      {market.length > 0 && (
        <ul className="grid gap-x-4 sm:grid-cols-2">
          {[...market].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="truncate">{p.name} <span className="text-muted">{p.overall}</span></span>
              <span className="tabular-nums text-muted">~{(p.price ?? 0).toLocaleString('tr-TR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
