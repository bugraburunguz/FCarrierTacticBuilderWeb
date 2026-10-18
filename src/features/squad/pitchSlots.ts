import type { PitchSlot } from '../../components/pitch/Pitch'
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
      // EA oyuncu kimliği: kariyer sahasında EA kart görseli (Pitch eaCards).
      assetId: s.player.assetId,
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
    fit: s.fit && { pct: s.fit.pct, state: s.fit.state },
    roleLabel: s.roleLabel,
    selected: s.selected,
  }))
}
