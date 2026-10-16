import { pitchSlotsOf } from '../../features/squad/pitchSlots'
import type { SlotView } from '../../features/squad/types'
import { Pitch as CardPitch } from '../pitch/Pitch'

export { pitchSlotsOf }

interface Props {
  slots: SlotView[]
  onPickPlayer: (slotId: string) => void
  onPickRole: (slotId: string) => void
  onRemove?: (slotId: string) => void
  onSwap?: (fromSlotId: string, toSlotId: string) => void
}

/** Kariyer sahası: oyuncu ve rol uyumu SlotView'dan gelir. */
export function Pitch({ slots, ...handlers }: Props) {
  return <CardPitch slots={pitchSlotsOf(slots)} {...handlers} />
}
