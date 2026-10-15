import { useQuery } from '@tanstack/react-query'
import { useMemo, useSyncExternalStore } from 'react'
import { endpoints } from '../../../api/endpoints'
import type { Formation, KbSbcSet, SbcChallenge, SbcResult } from '../../../api/types'
import { findChallengeFormation } from '../../../lib/sbcChallenge'
import { kbChallenges } from '../../../lib/kbSbc'
import { solveTraditionalAsync } from '../../../lib/solveAsync'
import { bigStore } from '../../../state/bigStore'
import { useUtCapture } from '../../../state/utCaptureStore'
import { utCardStore } from '../../../state/utCardStore'
import { buildPool, clubCandidates, marketCandidates, type Customize } from './candidates'
import { fetchMarketPlayers } from './marketPool'
import { planRequest, solveOptions, toPlanResult, type PlanResult } from './plan'
import { streamlinedPool } from './streamlinedPool'

const STALE_MS = 60_000
const PRICE_BATCH = 400

export interface SbcSetView {
  name?: string
  endsAt?: string
  challenges: SbcChallenge[]
}

/** Set ve görevleri: önce kullanıcının yakaladığı veri (durum dahil), yoksa bilgi tabanı (durum bilinmez → açık). */
export function useSbcSet(setId: number) {
  const capture = useUtCapture()
  const captured = useMemo(() => (capture?.sbcChallenges ?? []).filter((c) => c.setId === setId), [capture, setId])
  const kb = useQuery({ queryKey: ['kb-sbc-set', setId], queryFn: () => endpoints.kbSbcSet(setId), retry: false, staleTime: STALE_MS })
  const set: SbcSetView = {
    name: capture?.sbcSets?.find((s) => s.setId === setId)?.name ?? kb.data?.name ?? captured[0]?.setName,
    endsAt: (kb.data as KbSbcSet | undefined)?.endsAt,
    challenges: captured.length > 0 ? captured : kbChallenges(kb.data),
  }
  return { set, loading: captured.length === 0 && kb.isLoading, error: captured.length === 0 && kb.isError }
}

/** Kulüp kartları (IndexedDB önbelleği); aktif kadronun ilk 11 + yedekleri havuza girmez. */
export function useClubCards() {
  const library = useSyncExternalStore(bigStore.subscribe, () => utCardStore.get())
  const capture = useUtCapture()
  return useMemo(() => {
    const starters = new Set((capture?.activeSquad?.slots ?? []).flatMap((s) => (s.card?.instanceId !== undefined ? [s.card.instanceId] : [])))
    return (library?.cards ?? []).filter((c) => c.source === 'club' && !(c.instanceId !== undefined && starters.has(c.instanceId)))
  }, [library, capture])
}

/** Kare (squad) görev planı: katalog havuzu + bilgi tabanı fiyatları + kulüp → Worker'da çözüm (kurallar GET /ut/rules'tan, ≤3 sn). */
export function useSquadPlan(challenge: SbcChallenge | undefined, formations: Formation[] | undefined, customize: Customize) {
  const club = useClubCards()
  const formation = challenge && formations ? findChallengeFormation(challenge.formationLabel ?? challenge.formation, formations) : undefined
  return useQuery({
    queryKey: ['sbc-plan', challenge?.setId, challenge?.challengeId, formation?.id, customize, club.length, club[0]?.key],
    enabled: Boolean(challenge && formation),
    staleTime: Infinity,
    queryFn: async (): Promise<PlanResult> => {
      const request = planRequest(challenge!, formation!, customize)
      const [leagues, nations] = await Promise.all([endpoints.leagues(0), endpoints.nationalities()])
      const players = customize.onlyClub ? [] : await fetchMarketPlayers({ slots: request.slots, constraints: request.constraints, leagues, nations })
      const resources = [...new Set(players.flatMap((p) => (p.faceAssetId !== undefined ? [p.faceAssetId] : [])))]
      const priceRows = (await Promise.all(Array.from({ length: Math.ceil(resources.length / PRICE_BATCH) }, (_, i) => endpoints.kbLatestPrices(resources.slice(i * PRICE_BATCH, (i + 1) * PRICE_BATCH))))).flat()
      const prices = new Map(priceRows.map((r) => [r.resourceId, r.price]))
      const pool = buildPool(clubCandidates(club), marketCandidates(players, prices), customize)
      const solution = await solveTraditionalAsync(request.slots, pool, request.constraints, solveOptions())
      return toPlanResult(solution, request, formation!, pool)
    },
  })
}

/** Skor tabanlı görev: mevcut StreamlinedSolver ucu, havuz kulüp kartlarından. */
export function useScorePlan(challenge: SbcChallenge | undefined, authenticated: boolean) {
  const club = useClubCards()
  return useQuery({
    queryKey: ['sbc-score', challenge?.challengeId, club.length, club[0]?.key],
    // Skor ucu oturum ister: oturumsuzken çağrılmaz (sayfa giriş ister).
    enabled: authenticated && Boolean(challenge?.pointsRequired) && club.length > 0,
    staleTime: Infinity,
    queryFn: (): Promise<SbcResult> => endpoints.sbcStreamlined({ targetScore: challenge!.pointsRequired!, pool: streamlinedPool(club) }),
  })
}
