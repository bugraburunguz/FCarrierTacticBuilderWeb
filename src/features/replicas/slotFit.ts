import type { ReplicaApplySlot } from '../../api/types'
import { fitDisplay, levelFitText, levelPct, roleFitText, rolePointsText, type FitLabel } from '../../lib/fitLabels'

export function slotFit(slot: ReplicaApplySlot, mode: 'career' | 'ut') {
  const display = fitDisplay({ fitLabel: slot.state === 'EMPTY' ? undefined : (slot.state as FitLabel), levelFit: slot.levelFit, currentFit: slot.currentFit })
  if (mode === 'ut') {
    const pct = levelPct(display)
    return { ...display, pct, metric: undefined, text: slot.levelFit !== null ? roleFitText(pct) : rolePointsText(display.rolePoints) }
  }
  return { ...display, text: display.roleFit === undefined ? '' : levelFitText(display.roleFit) }
}
