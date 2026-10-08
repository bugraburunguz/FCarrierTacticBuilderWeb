import type { CaptureCard, CaptureResult, Formation } from '../api/types'
import { cardPrice, fromCapture, type UtCard } from './utCard'

type ActiveSquad = NonNullable<CaptureResult['activeSquad']>

export interface LoadedSquad {
  formationId?: string
  picked: Record<string, UtCard>
  unplaced: number
}

const norm = (value?: string) => (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Yakalanan formasyon adını/etiketini bizim formasyon listemizle eşler (tam eşleşme, yoksa etiket içerme). */
export function findFormation(squad: ActiveSquad, formations: Formation[]): Formation | undefined {
  const keys = [squad.formation, squad.formationLabel].map(norm).filter(Boolean)
  return (
    formations.find((f) => keys.includes(norm(f.id)) || keys.includes(norm(f.label))) ??
    formations.find((f) => keys.some((k) => norm(f.label).startsWith(k) || norm(f.id).startsWith(k)))
  )
}

/**
 * Aktif kadrodaki ilk 11'i formasyon slotlarına dizer: önce aynı mevki, sonra kalanlar sırayla.
 * Slot sırası EA verisiyle birebir doğrulanmadığı için eşleme mevkiye dayanır.
 */
export function mapActiveSquad(squad: ActiveSquad, formations: Formation[], fallback?: Formation): LoadedSquad {
  const formation = findFormation(squad, formations) ?? fallback
  const starters = squad.slots.filter((s) => s.starter && s.card).sort((a, b) => a.index - b.index)
  const picked: Record<string, UtCard> = {}
  if (!formation) {
    return { picked, unplaced: starters.length }
  }
  const used = new Set<number>()
  const toCard = (card: CaptureCard) => fromCapture(card, 'club', cardPrice(card))
  formation.slots.forEach((slot) => {
    const index = starters.findIndex((s, i) => !used.has(i) && s.position === slot.position)
    if (index >= 0) {
      used.add(index)
      picked[slot.slotId] = toCard(starters[index].card!)
    }
  })
  formation.slots.forEach((slot) => {
    if (!picked[slot.slotId]) {
      const index = starters.findIndex((_, i) => !used.has(i))
      if (index >= 0) {
        used.add(index)
        picked[slot.slotId] = toCard(starters[index].card!)
      }
    }
  })
  return { formationId: formation.id, picked, unplaced: starters.length - used.size }
}
