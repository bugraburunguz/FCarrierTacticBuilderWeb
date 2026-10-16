import type { ReplicaApplySlot } from '../../api/types'
import { fitDisplay, levelText, rolePointsText, type FitLabel } from '../../lib/fitLabels'

/** Slotun uyum rozeti ve metni: aynı sözlük (`fitLabels`) her ekranda aynı sayıyı ve durumu verir. Kariyerde seviyeye göre (levelFit), UT'de rol puanı. */
export function slotFit(slot: ReplicaApplySlot) {
  const display = fitDisplay({ fitLabel: slot.state === 'EMPTY' ? undefined : (slot.state as FitLabel), levelFit: slot.levelFit, currentFit: slot.currentFit })
  return { ...display, text: slot.levelFit !== null ? levelText(display.pct) : rolePointsText(display.rolePoints) }
}
