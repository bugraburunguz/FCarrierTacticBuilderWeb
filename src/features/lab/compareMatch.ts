/** Karşılaştır'da slot eşleme (KARIYER-UX FAZ 5, 4b-2 kararı). */
export interface CompareSlot {
  slotId: string
  position: string
  /** Formasyondaki yatay konum (0 sol, 100 sağ). */
  x: number
}

export interface CompareSide {
  formation: string
  slots: CompareSlot[]
}

export interface SlotPair {
  a: string
  b: string
  position: string
}

export interface SlotMatch {
  pairs: SlotPair[]
  onlyA: string[]
  onlyB: string[]
}

/**
 * Aynı formasyon: slot kimliğiyle (A'nın sırası). Farklı formasyon: mevkiye göre; aynı mevkide birden çok slot varsa soldan sağa sıra eşlenir.
 * Eşleşmeyen slotlar `onlyA` / `onlyB` (kendi tarafının sırasıyla).
 */
export function matchSlots(a: CompareSide, b: CompareSide): SlotMatch {
  if (a.formation === b.formation) {
    const inB = new Set(b.slots.map((s) => s.slotId))
    const inA = new Set(a.slots.map((s) => s.slotId))
    return {
      pairs: a.slots.filter((s) => inB.has(s.slotId)).map((s) => ({ a: s.slotId, b: s.slotId, position: s.position })),
      onlyA: a.slots.filter((s) => !inB.has(s.slotId)).map((s) => s.slotId),
      onlyB: b.slots.filter((s) => !inA.has(s.slotId)).map((s) => s.slotId),
    }
  }
  const leftToRight = (slots: CompareSlot[], position: string) => slots.filter((s) => s.position === position).sort((p, q) => p.x - q.x)
  const pairs: SlotPair[] = []
  const matchedA = new Set<string>()
  const matchedB = new Set<string>()
  for (const position of [...new Set(a.slots.map((s) => s.position))]) {
    const sideA = leftToRight(a.slots, position)
    const sideB = leftToRight(b.slots, position)
    for (let i = 0; i < Math.min(sideA.length, sideB.length); i += 1) {
      pairs.push({ a: sideA[i].slotId, b: sideB[i].slotId, position })
      matchedA.add(sideA[i].slotId)
      matchedB.add(sideB[i].slotId)
    }
  }
  const order = new Map(a.slots.map((s, i) => [s.slotId, i]))
  pairs.sort((p, q) => order.get(p.a)! - order.get(q.a)!)
  return {
    pairs,
    onlyA: a.slots.filter((s) => !matchedA.has(s.slotId)).map((s) => s.slotId),
    onlyB: b.slots.filter((s) => !matchedB.has(s.slotId)).map((s) => s.slotId),
  }
}
