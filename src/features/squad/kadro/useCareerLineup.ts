import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import type { CareerPlayer, Formation } from '../../../api/types'
import { pickBench } from '../../../lib/bench'
import { fitDisplay } from '../../../lib/fitLabels'
import { mirrorTactic } from '../../../lib/mirror'
import { swapSlots } from '../../../lib/squadBuilder'
import { lineupStore } from '../../../state/lineupStore'
import { tacticStore, toTacticRequest, useTactic } from '../../../state/tacticStore'
import type { SlotView } from '../types'

const MIN_SQUAD = 11

function cardInfo(squad: CareerPlayer[], playerId?: number) {
  const p = squad.find((c) => c.player.id === playerId)?.player
  return { assetId: p?.faceAssetId, faceUrl: p?.faceUrl, club: p?.club, league: p?.league, nationality: p?.nationality }
}

export const shortRole = (name: string) => name.replace(/\s*\(.*\)/, '')

/** "Winger (Balanced)" → "Winger · Balanced" (kurucudaki rol etiketiyle aynı biçim). Eski kaçışsız `/((.*))/` adı iki kez yazıyordu. */
export function roleLabelOf(roleName: string): string {
  const focus = roleName.match(/\((.*)\)/)?.[1]
  return focus ? `${shortRole(roleName)} · ${focus}` : shortRole(roleName)
}

/**
 * Seçili taktikte ilk 11 + yedekler (V3-07b; TacticLineup'tan çıkarıldı): tek /fit/lineup sorgusu, yedek kulübesi, aynalama.
 * Sahada karta tıklamak kadro kurucuya götürür; iki kartı yer değiştirmek dizilişi kurucuya kaydedip oraya geçer. v2 ve v3 aynı hook.
 */
export function useCareerLineup(careerId: number, squad: CareerPlayer[], formations: Formation[]) {
  const tactic = useTactic()
  const navigate = useNavigate()
  const request = toTacticRequest(tactic)
  const formation = formations.find((f) => f.id === tactic.formation)
  const enough = squad.length >= MIN_SQUAD
  const lineup = useQuery({
    queryKey: ['lineup', careerId, squad.length, JSON.stringify(request)],
    queryFn: () => endpoints.lineup(careerId, request),
    enabled: enough && formation !== undefined,
    retry: false,
  })
  const fit = lineup.data
  const bench = fit ? pickBench(squad, fit) : []
  const views: SlotView[] = (formation?.slots ?? []).map((sl) => {
    const result = fit?.slots.find((s) => s.slotId === sl.slotId)
    return {
      slotId: sl.slotId,
      position: sl.position,
      x: sl.x,
      y: sl.y,
      player: result?.playerName ? { id: result.playerId ?? 0, name: result.playerName, overall: result.overall ?? 0, ...cardInfo(squad, result.playerId) } : undefined,
      roleLabel: result ? roleLabelOf(result.roleName) : '…',
      // V3-07c 0a: yüzde ve etiket aynı RoleFit'ten (fitDisplay); eskiden yüzde ham rol puanı (score), renk levelFit'ten geliyordu.
      fit: result?.roleFit ? { pct: fitDisplay(result.roleFit).pct, state: fitDisplay(result.roleFit).state, band: result.roleFit.badge } : undefined,
    }
  })

  const openBuilder = () => navigate('/squad/builder')
  const swap = (from: string, to: string) => {
    if (!fit) {
      return
    }
    const current: Record<string, number> = {}
    fit.slots.forEach((s) => {
      if (s.playerId !== undefined) {
        current[s.slotId] = s.playerId
      }
    })
    lineupStore.set(careerId, swapSlots(current, from, to))
    navigate('/squad/builder')
  }
  const saveMirrored = () => tacticStore.set(mirrorTactic(tactic))

  return { tactic, formation, enough, lineup, fit, bench, views, openBuilder, swap, saveMirrored }
}
