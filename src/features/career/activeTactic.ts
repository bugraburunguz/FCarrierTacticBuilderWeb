import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, StarterTactic, UserTactic } from '../../api/types'
import type { DataSource } from '../../design/components/primitives'
import { remapAssignments } from '../../lib/squadBuilder'
import { DEFAULT_TACTIC, fromStarter, fromUserTactic, toSaveBody, type Lineup, type TacticState } from '../../lib/tactic'
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
  main?: Readonly<UserTactic>
  starter?: Readonly<StarterTactic>
}

export function useActiveTactic(careerId: number | undefined) {
  const main = useQuery({ queryKey: mainTacticKey(careerId), queryFn: () => endpoints.mainTactic(careerId!), enabled: careerId !== undefined })
  const needStarter = main.isSuccess && main.data === null
  const starter = useQuery({ queryKey: starterTacticKey(careerId), queryFn: () => endpoints.starterTactic(careerId!), enabled: careerId !== undefined && needStarter, retry: false })

  const active = useMemo<ActiveTactic | undefined>(() => {
    if (main.data) {
      return { source: { kind: 'decision' }, ...fromUserTactic(main.data), dropped: main.data.lineupDropped ?? 0, main: main.data }
    }
    if (needStarter && starter.data) {
      return { source: { kind: 'auto' }, ...fromStarter(starter.data), dropped: 0, starter: starter.data }
    }
    return undefined
  }, [main.data, needStarter, starter.data])

  return { active, isLoading: main.isLoading || (needStarter && starter.isLoading), error: main.error ?? starter.error }
}

/**
 * Salt okunur bağlama (Masa, Kadro, Transfer): kadro çekirdeği ana taktiği (yoksa öneriyi) görür ama değiştiremez; patch hiçbir depoya yazmaz.
 * Düzenleme yalnız Lab'da (katman 3).
 */
export function useMainTacticBinding(careerId: number | undefined, squad: readonly CareerPlayer[] | undefined) {
  const { active, isLoading, error } = useActiveTactic(careerId)
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
  return { binding, source: active?.source, dropped: active?.dropped ?? 0, active, isLoading, error, playerById }
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
    },
  })
}
