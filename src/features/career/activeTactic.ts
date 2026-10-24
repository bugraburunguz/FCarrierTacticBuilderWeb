import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, StarterTactic, UserTactic } from '../../api/types'
import type { DataSource } from '../../design/components/primitives'
import { remapAssignments } from '../../lib/squadBuilder'
import { DEFAULT_TACTIC, fromStarter, fromUserTactic, mainTacticName, toSaveBody, toTacticRequest, type Lineup, type TacticState } from '../../lib/tactic'
import { squadStateOf } from '../squad/tacticState'
import type { SquadBinding } from '../squad/types'

/*
 * Katman 2 · kariyer kararı (KARIYER-UX D-28/D-30): ana taktik sunucuda; yoksa ücretsiz otomatik başlangıç önerisi (D-31). Yalnız TanStack Query;
 * bileşenler önbelleği yerinde değiştirmez, değişiklik yalnız mutation + invalidate ile. Masa, Kadro ve Transfer bu kaynaktan hesaplar.
 */
export const mainTacticKey = (careerId: number | undefined) => ['main-tactic', careerId] as const
export const starterTacticKey = (careerId: number | undefined) => ['starter-tactic', careerId] as const

export interface ActiveTactic {
  source: Extract<DataSource, { kind: 'decision' } | { kind: 'auto' }>
  tactic: Readonly<TacticState>
  lineup: Readonly<Lineup>
  /** Ana taktikte kadrodan düştüğü için /fit/lineup'ın dolduracağı oyuncu sayısı (Q2). */
  dropped: number
  /** Düşen oyuncuların yeri /fit/lineup ile dolduruldu (lineup doldurulmuş hâli); gelmezse slotlar boş kalır. */
  filled: boolean
  main?: Readonly<UserTactic>
  starter?: Readonly<StarterTactic>
}

/** Q2: doldurma (/fit/lineup) geldiyse "otomatik dolduruldu", gelmediyse boş slotu doğru anlatır. Panel ve Masa aynı metni kullanır. */
export const droppedText = ({ dropped, filled }: Pick<ActiveTactic, 'dropped' | 'filled'>) =>
  filled ? `${dropped} oyuncu kadroda yok, otomatik dolduruldu` : `${dropped} oyuncu artık kadroda yok, slotları boş`

export function useActiveTactic(careerId: number | undefined) {
  const main = useQuery({ queryKey: mainTacticKey(careerId), queryFn: () => endpoints.mainTactic(careerId!), enabled: careerId !== undefined })
  const needStarter = main.isSuccess && main.data === null
  const starter = useQuery({ queryKey: starterTacticKey(careerId), queryFn: () => endpoints.starterTactic(careerId!), enabled: careerId !== undefined && needStarter, retry: false })
  const saved = useMemo(() => (main.data ? fromUserTactic(main.data) : undefined), [main.data])
  // Q2: kadrodan düşen oyuncu varsa kalan dizilen oyuncular kilitli, boş slotları sunucu doldurur (yalnız okuma; ana taktiğe yazılmaz).
  const dropped = main.data?.lineupDropped ?? 0
  const fill = useQuery({
    queryKey: ['lineup', careerId, 'main-fill', main.data?.slot, main.data?.updatedAt, saved?.lineup],
    queryFn: () => endpoints.lineup(careerId!, toTacticRequest(saved!.tactic), { ...saved!.lineup }),
    enabled: careerId !== undefined && saved !== undefined && dropped > 0,
    retry: false,
  })

  const active = useMemo<ActiveTactic | undefined>(() => {
    if (main.data && saved) {
      const filledLineup = fill.data && Object.fromEntries(fill.data.slots.flatMap((s) => (s.playerId === undefined || s.playerId === null ? [] : [[s.slotId, s.playerId]])))
      // FAZ 6a-F: göçten gelen ("Önceki taslak") ya da boş ad Masa/Kadro/Lab'da "Ana taktik · <formasyon>" görünür.
      const named = { ...main.data, name: mainTacticName(main.data.name, saved.tactic.formation) }
      return { source: { kind: 'decision' }, tactic: saved.tactic, lineup: filledLineup ?? saved.lineup, dropped, filled: filledLineup !== undefined, main: named }
    }
    if (needStarter && starter.data) {
      return { source: { kind: 'auto' }, ...fromStarter(starter.data), dropped: 0, filled: false, starter: starter.data }
    }
    return undefined
  }, [main.data, saved, dropped, fill.data, needStarter, starter.data])

  // mainLoading: yalnız ana taktik sorgusu. Öneri paneli buna bağlanmalı; isLoading'e bağlanırsa öneri hatasında panel bağlanıp sökülür
  // ve her bağlanışta istek yinelenir (döngü, FAZ 2 düzeltme).
  return { active, isLoading: main.isLoading || (needStarter && starter.isLoading), mainLoading: main.isLoading, error: main.error ?? starter.error }
}

/**
 * Salt okunur bağlama (Masa, Kadro, Transfer): kadro çekirdeği ana taktiği (yoksa öneriyi) görür ama değiştiremez; patch hiçbir depoya yazmaz.
 * Düzenleme yalnız Lab'da (katman 3).
 */
export function useMainTacticBinding(careerId: number | undefined, squad: readonly CareerPlayer[] | undefined) {
  const { active, isLoading, mainLoading, error } = useActiveTactic(careerId)
  const playerById = useMemo(() => new Map((squad ?? []).map((c) => [c.player.id, c.player])), [squad])
  const binding: SquadBinding<number> = useMemo(() => ({
    state: squadStateOf(active?.tactic ?? DEFAULT_TACTIC, { ...(active?.lineup ?? {}) }),
    patch: () => {
      if (import.meta.env.DEV) {
        console.warn('[KARIYER-UX] ana taktik salt okunur: düzenleme Lab taslağında yapılır')
      }
    },
    carry: (_old, prev, next) => remapAssignments(prev, (pid) => playerById.get(pid)?.positions, next),
    keyOf: String,
    faceOf: (playerId) => {
      const p = playerById.get(playerId)
      return p && { faceStats: p.faceStats, faceLabels: p.faceLabels, faceStatsSource: p.faceStatsSource, faceStatsApproximate: p.faceStatsApproximate, positions: p.positions }
    },
    defaultFormation: DEFAULT_TACTIC.formation,
    keepAssignedOnImport: true,
  }), [active, playerById])
  return { binding, source: active?.source, dropped: active?.dropped ?? 0, filled: active?.filled ?? false, active, isLoading, mainLoading, error, playerById }
}

/** "Ana taktiğim yap": taslağı (ya da öneriyi) slota yazar, ana taktik yapar; ana taktiğe bağlı sorgular yenilenir. */
export function useMakeMainTactic(careerId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ slot, name, tactic, lineup }: { slot: number; name: string; tactic: Readonly<TacticState>; lineup: Readonly<Lineup> }) => {
      await endpoints.saveUserTactic(slot, toSaveBody(careerId, name, structuredClone(tactic) as TacticState, { ...lineup }))
      return endpoints.setMainTactic(slot, careerId)
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: mainTacticKey(careerId) })
      void client.invalidateQueries({ queryKey: ['user-tactics', careerId] })
      void client.invalidateQueries({ queryKey: ['lineup', careerId] })
      // FAZ 4a: ana taktik varken öneri gösterilmez ama önbellekte eski kalmasın; Masa/Kadro rol uyumu yeni dizilişten yeniden hesaplanır.
      void client.invalidateQueries({ queryKey: starterTacticKey(careerId) })
      void client.invalidateQueries({ queryKey: ['slot-fit'] })
    },
  })
}
