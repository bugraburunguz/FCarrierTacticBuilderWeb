import { Pitch as CardPitch, type PitchSlot } from '../pitch/Pitch'
import type { FitState } from '../card/FitBadge'
import type { SlotView } from './PositionCard'

interface Props {
  slots: SlotView[]
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove?: (slotId: string) => void
  onSwap?: (fromSlotId: string, toSlotId: string) => void
}

const FIT_STATE = { GREEN: 'good', YELLOW: 'ok', RED: 'bad' } as const satisfies Record<string, FitState>

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
    fit: s.fit && { pct: s.fit.pct, state: FIT_STATE[s.fit.band] },
    roleLabel: s.roleLabel,
    selected: s.selected,
  }))
}

/** Kariyer sahası: oyuncu ve rol uyumu SlotView'dan gelir. */
export function Pitch({ slots, ...handlers }: Props) {
  return <CardPitch slots={pitchSlotsOf(slots)} {...handlers} />
}
