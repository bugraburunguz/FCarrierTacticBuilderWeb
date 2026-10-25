import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, RosterEventType } from '../../api/types'
import { invalidateCareerScope } from '../../lib/careerQueries'
import { analyzeDepth } from '../../lib/depth'
import type { TacticState } from '../../lib/tactic'
import { useActiveCareerId } from '../../state/careerStore'
import { useUtRules } from '../../state/rulesStore'
import { useMainTacticFits } from '../career/useMainTacticFits'

/**
 * Kariyer verisi değişince (hareket, geri alma) o kariyere bağlı her şey tazelenir: kadro, bütçe/facets, uyum (slot-fit), başlangıç önerisi,
 * oyuncu sayfaları (REVIEW Y3; önceden yalnız 6 anahtar, bütçe ve uyum 2-5 dk bayat kalıyordu).
 */
export function useInvalidateCareer() {
  const queryClient = useQueryClient()
  const careerId = useActiveCareerId()
  return () => (careerId === undefined
    ? queryClient.invalidateQueries({ queryKey: ['careers'] })
    : invalidateCareerScope(queryClient, careerId))
}

export type OutMove = { mode: 'SELL' | 'LOAN_OUT'; entry: CareerPlayer }

/**
 * Kadro Analizi verisi (KARIYER-UX FAZ 3): aktif kariyer, kadro, hareketler, mevki önerileri, satış/kiralık verme akışı ve
 * ana taktiğe (yoksa başlangıç önerisine) göre derinlik ihtiyacı. Katman 1-2; eski tek kopya taktik deposu ve Lab taslağı okunmaz.
 */
export function useCareerSquadData() {
  useUtRules()
  const careerId = useActiveCareerId()
  const refresh = useInvalidateCareer()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const events = useQuery({ queryKey: ['events', id], queryFn: () => endpoints.events(id!), enabled: id !== undefined })
  // FIT-3: oyuncu › Roller (RoleBasedAdvice) ile aynı anahtar (pahalı uç tek kez); kadro değişince careerQueries kapsamı tazeler.
  const positionAdvice = useQuery({ queryKey: ['position-advice', id], queryFn: () => endpoints.positionAdvice(id!), enabled: id !== undefined && (squad.data?.length ?? 0) > 0, staleTime: 120_000 })
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: Infinity })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const fits = useMainTacticFits(id, squad.data)
  const tactic = fits.main.active?.tactic
  const formation = formations.data?.find((f) => f.id === tactic?.formation)
  const needs = useMemo(() => (formation && tactic ? analyzeDepth(squad.data ?? [], formation, tactic as TacticState, roles.data ?? []) : []), [formation, tactic, squad.data, roles.data])
  const squadIds = useMemo(() => new Set((squad.data ?? []).map((s) => s.player.id)), [squad.data])
  const [dialog, setDialog] = useState<OutMove | null>(null)
  const move = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number; feeEur: number; toClubId?: number }) => endpoints.applyEvent(id!, v),
    onSuccess: async () => {
      setDialog(null)
      await refresh()
    },
  })

  /** Satış / kiralık verme diyaloğunu açar (önceki hata temizlenir). */
  const openMove = (mode: OutMove['mode'], entry: CareerPlayer) => {
    move.reset()
    setDialog({ mode, entry })
  }
  const submitMove = (v: { feeEur: number; toClubId?: number }) => dialog && move.mutate({ type: dialog.mode, playerId: dialog.entry.player.id, ...v })

  return { careers, career, squad, events, positionAdvice, formation, needs, squadIds, fits, dialog, setDialog, move, openMove, submitMove }
}
