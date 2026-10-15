import type { PlanCandidate } from './candidates'

export interface ShoppingList {
  /** Alınacak (pazar/katalog) kartlar: fiyatı bilinenler önce, pahalıdan ucuza. */
  buy: PlanCandidate[]
  /** Yalnız bilinen fiyatların toplamı. */
  knownTotal: number
  unknownCount: number
  /** Kulüpten kullanılan kartlar: takas edilemeyenler önce. */
  club: PlanCandidate[]
  clubUntradeable: number
}

export function shoppingList(picks: (PlanCandidate | undefined)[]): ShoppingList {
  const filled = picks.filter((p): p is PlanCandidate => Boolean(p))
  const buy = filled.filter((p) => p.tier >= 2).sort((a, b) => (b.knownPrice ?? -1) - (a.knownPrice ?? -1) || b.overall - a.overall)
  const club = filled.filter((p) => p.tier <= 1).sort((a, b) => a.tier - b.tier || a.overall - b.overall)
  return {
    buy,
    knownTotal: buy.reduce((n, p) => n + (p.knownPrice ?? 0), 0),
    unknownCount: buy.filter((p) => p.knownPrice === undefined).length,
    club,
    clubUntradeable: club.filter((p) => p.untradeable).length,
  }
}

export const coins = (value: number) => value.toLocaleString('tr-TR')

/** [Kopyala] metni: başlık, alınacak kartlar (ad, reyting, mevki, fiyat ya da "fiyat yok"), toplam ve bilinmeyen sayısı. */
export function shoppingText(title: string, list: ShoppingList): string {
  const lines = [title, ...list.buy.map((p, i) => `${i + 1}. ${p.name} (${p.overall}, ${p.positions[0] ?? ''}) — ${p.knownPrice !== undefined ? coins(p.knownPrice) : 'fiyat yok'}`)]
  lines.push(`Toplam: ${coins(list.knownTotal)}${list.unknownCount > 0 ? ` · ${list.unknownCount} kartın fiyatı bilinmiyor` : ''}`)
  return lines.join('\n')
}
