import type { CaptureCard, CaptureResult, Formation } from '../api/types'
import { cardPrice, fromCapture, type UtCard } from './utCard'

type ActiveSquad = NonNullable<CaptureResult['activeSquad']>

export interface LoadedSquad {
  formationId?: string
  picked: Record<string, UtCard>
  unplaced: number
}

const norm = (value?: string) => (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** EA mevki adını bizim genel mevkimize çevirir (RCB/LCB → CB, RDM/LDM → CDM, RCM/LCM → CM, RAM/LAM → CAM, RS/LS → ST). */
export function generalPosition(position?: string): string {
  const map: Record<string, string> = { RCB: 'CB', LCB: 'CB', RDM: 'CDM', LDM: 'CDM', RCM: 'CM', LCM: 'CM', RAM: 'CAM', LAM: 'CAM', RS: 'ST', LS: 'ST', CF: 'ST' }
  return map[position ?? ''] ?? position ?? ''
}

const digits = (value?: string) => (value ?? '').replace(/\D/g, '')

/**
 * Yakalanan formasyonu bizimkiyle eşler: önce ilk 11'in mevki dizilimi (genel mevkilere indirgenmiş) birebir aynı olan formasyon,
 * birden fazlaysa etiketteki rakamlara (4-4-1-1 → 4411) en yakın olan; dizilim bulunamazsa ad/etiket eşleşmesi.
 */
export function findFormation(squad: ActiveSquad, formations: Formation[]): Formation | undefined {
  const starters = squad.slots.filter((s) => s.starter).map((s) => generalPosition(s.position)).filter(Boolean).sort().join(',')
  const sameShape = starters
    ? formations.filter((f) => f.slots.map((slot) => slot.position).sort().join(',') === starters)
    : []
  if (sameShape.length > 0) {
    const wanted = digits(squad.formationLabel ?? squad.formation)
    return sameShape.find((f) => digits(f.id) === wanted) ?? sameShape.find((f) => digits(f.label) === wanted) ?? sameShape[0]
  }
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
    const index = starters.findIndex((s, i) => !used.has(i) && generalPosition(s.position) === slot.position)
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
