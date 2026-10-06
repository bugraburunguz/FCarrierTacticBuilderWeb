import type { TacticState } from '../state/tacticStore'

const PAIRS: [string, string][] = [
  ['LB', 'RB'], ['LCB', 'RCB'], ['LM', 'RM'], ['LW', 'RW'],
  ['LCM', 'RCM'], ['LDM', 'RDM'], ['LAM', 'RAM'], ['LST', 'RST'],
]

/** Sol/sağ eş slotların davranış ve rollerini yer değiştirir; merkez slotlar aynı kalır. */
export function mirrorTactic(tactic: TacticState): TacticState {
  const slots = { ...tactic.slots }
  PAIRS.forEach(([left, right]) => {
    const l = tactic.slots[left]
    const r = tactic.slots[right]
    if (l === undefined && r === undefined) {
      return
    }
    if (r === undefined) {
      delete slots[left]
    } else {
      slots[left] = r
    }
    if (l === undefined) {
      delete slots[right]
    } else {
      slots[right] = l
    }
  })
  return { ...tactic, slots }
}
