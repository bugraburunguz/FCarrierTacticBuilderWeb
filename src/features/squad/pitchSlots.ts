import type { PitchSlot } from '../../components/pitch/Pitch'
import { FIT_STATE_OF, toneOf } from '../../lib/fitTone'
import type { SlotView } from './types'

/** SlotView → ortak saha slotu (kariyer ve UT aynı FC kartlarını çizer; yüz değerleri kartta görünür). */
export function pitchSlotsOf(slots: SlotView[]): PitchSlot[] {
  return slots.map((s) => ({
    slotId: s.slotId,
    position: s.position,
    x: s.x,
    y: s.y,
    player: s.player && {
      name: s.player.name,
      rating: s.player.overall,
      position: s.position,
      faceUrl: s.player.faceUrl,
      club: s.player.club,
      league: s.player.league,
      nationality: s.player.nationality,
      faceStats: s.player.faceStats,
      faceLabels: s.player.faceLabels,
      faceStatsApproximate: s.player.faceStatsApproximate,
    },
    fit: s.fit && { pct: s.fit.pct, state: FIT_STATE_OF[toneOf(s.fit.band)] },
    roleLabel: s.roleLabel,
    selected: s.selected,
  }))
}
