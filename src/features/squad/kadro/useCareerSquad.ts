import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../../api/endpoints'
import type { CareerPlayer, RosterEventType } from '../../../api/types'
import { analyzeDepth } from '../../../lib/depth'
import { useActiveCareerId } from '../../../state/careerStore'
import { useUtRules } from '../../../state/rulesStore'
import { useTactic } from '../../../state/tacticStore'

/** Kariyer verisi değişince tazelenen sorgular (kariyer listesi, kadro, hareketler). */
export function useInvalidateCareer() {
  const queryClient = useQueryClient()
  return () => Promise.all(['careers', 'squad', 'events', 'career-moves'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
}

export type OutMove = { mode: 'SELL' | 'LOAN_OUT'; entry: CareerPlayer }

/**
 * Kadro sayfasının ortak verisi (V3-07b; SquadPage'den çıkarıldı): aktif kariyer, kadro, hareketler, mevki önerileri, seçili taktiğe göre
 * derinlik ihtiyacı ve satış/kiralık verme akışı. v2 SquadPage ve v3 KadroPage aynı hook'u kullanır.
 */
export function useCareerSquad() {
  useUtRules()
  const careerId = useActiveCareerId()
  const refresh = useInvalidateCareer()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId)
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined })
  const events = useQuery({ queryKey: ['events', careerId], queryFn: () => endpoints.events(careerId!), enabled: careerId !== undefined })
  const [dialog, setDialog] = useState<OutMove | null>(null)
  const move = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number; feeEur: number; toClubId?: number }) => endpoints.applyEvent(careerId!, v),
    onSuccess: async () => {
      setDialog(null)
      await refresh()
    },
  })
  const positionAdvice = useQuery({ queryKey: ['position-advice', careerId, squad.data?.length], queryFn: () => endpoints.positionAdvice(careerId!), enabled: careerId !== undefined && (squad.data?.length ?? 0) > 0, staleTime: 120_000 })
  const tactic = useTactic()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: Infinity })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const needs = formation ? analyzeDepth(squad.data ?? [], formation, tactic, roles.data ?? []) : []
  const squadIds = new Set((squad.data ?? []).map((s) => s.player.id))

  /** Satış / kiralık verme diyaloğunu açar (önceki hata temizlenir). */
  const openMove = (mode: OutMove['mode'], entry: CareerPlayer) => {
    move.reset()
    setDialog({ mode, entry })
  }
  const submitMove = (v: { feeEur: number; toClubId?: number }) => dialog && move.mutate({ type: dialog.mode, playerId: dialog.entry.player.id, ...v })

  return { careerId, careers, career, squad, events, positionAdvice, formations, formation, needs, squadIds, dialog, setDialog, move, openMove, submitMove }
}
