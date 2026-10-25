import type { AcademyPlayer, AcademyStatus } from '../../api/types'

/**
 * ACADEMY-b §2 saf kurallar: öne çıkan kartlar (en çok 3, kural tutmuyorsa kart yok), sıralama ve hat filtresi (adreste: ?sirala=, ?hat=),
 * satır durumu metni. Altyapı ve Gelişim aynı satırları kullanır.
 */

export type AcademySort = 'potansiyel' | 'yas' | 'hazirlik'
export type AcademyLine = 'tumu' | 'defans' | 'orta' | 'hucum'

export const SORTS: { id: AcademySort; label: string }[] = [
  { id: 'potansiyel', label: 'Potansiyel' },
  { id: 'yas', label: 'Yaş' },
  { id: 'hazirlik', label: 'Hazırlık' },
]
export const LINES: { id: AcademyLine; label: string }[] = [
  { id: 'tumu', label: 'Tümü' },
  { id: 'defans', label: 'Defans' },
  { id: 'orta', label: 'Orta saha' },
  { id: 'hucum', label: 'Hücum' },
]
export const STATUS_LABEL: Record<AcademyStatus, string> = { READY: 'Hazır', GROWING: 'Gelişiyor', WAITING: 'Bekliyor' }

const DEFENCE = new Set(['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB'])
const ATTACK = new Set(['LW', 'RW', 'ST', 'CF'])
const STATUS_ORDER: Record<AcademyStatus, number> = { READY: 0, GROWING: 1, WAITING: 2 }

export const parseSort = (value: string | null): AcademySort => (SORTS.some((s) => s.id === value) ? value as AcademySort : 'potansiyel')
export const parseLine = (value: string | null): AcademyLine => (LINES.some((l) => l.id === value) ? value as AcademyLine : 'tumu')

/** Hat: en iyi mevki (yoksa ilk listelenen); kaleci Defans'ta. */
export function lineOf(p: AcademyPlayer): Exclude<AcademyLine, 'tumu'> {
  const position = p.bestPosition ?? p.positions[0] ?? ''
  return DEFENCE.has(position) ? 'defans' : ATTACK.has(position) ? 'hucum' : 'orta'
}

/** Sıralama potansiyeli: gerçek değer, aralık modunda bandın alt sınırı. */
const potentialKey = (p: AcademyPlayer) => p.potential ?? (p.potentialRange ? Number(p.potentialRange.split('–')[0]) : -1)

export const potText = (p: AcademyPlayer) => (p.potential !== undefined && p.potential !== null ? String(p.potential) : p.potentialRange ?? '—')

export function sortPlayers(players: readonly AcademyPlayer[], sort: AcademySort): AcademyPlayer[] {
  const byName = (a: AcademyPlayer, b: AcademyPlayer) => a.name.localeCompare(b.name, 'tr')
  const list = [...players]
  if (sort === 'yas') {
    return list.sort((a, b) => (a.age ?? 99) - (b.age ?? 99) || potentialKey(b) - potentialKey(a) || byName(a, b))
  }
  if (sort === 'hazirlik') {
    const order = (p: AcademyPlayer) => (p.status ? STATUS_ORDER[p.status] : 1)
    return list.sort((a, b) => order(a) - order(b) || (b.promote?.strength1 ?? 0) - (a.promote?.strength1 ?? 0) || (b.overall ?? 0) - (a.overall ?? 0) || byName(a, b))
  }
  return list.sort((a, b) => potentialKey(b) - potentialKey(a) || (b.overall ?? 0) - (a.overall ?? 0) || byName(a, b))
}

export const visiblePlayers = (players: readonly AcademyPlayer[], sort: AcademySort, line: AcademyLine) =>
  sortPlayers(line === 'tumu' ? players : players.filter((p) => lineOf(p) === line), sort)

export type Highlight =
  | { kind: 'READY'; player: AcademyPlayer; text: string; estimated: true }
  | { kind: 'TOP_POTENTIAL'; player: AcademyPlayer; text: string }
  | { kind: 'PLAN_NEEDED'; count: number; text: string }

/** Öne çıkanlar (en çok 3, sabit sıra): A takıma hazır (yedeği en çok geçen) · En yüksek potansiyel · Plan seçilmeli (Dengeli dışı plan sayısı). */
export function highlights(players: readonly AcademyPlayer[]): Highlight[] {
  const cards: Highlight[] = []
  const margin = (p: AcademyPlayer) => (p.promote ? p.promote.strength1 - (p.promote.backupStrength ?? 0) : -Infinity)
  const ready = players.filter((p) => p.promote).sort((a, b) => margin(b) - margin(a))[0]
  if (ready?.promote) {
    const { position, backupStrength } = ready.promote
    const text = backupStrength === undefined || backupStrength === null ? `${position} için yedek yok; 1 sezonda yer bulur` : `1 sezon sonra ${position} yedeğini geçer`
    cards.push({ kind: 'READY', player: ready, text, estimated: true })
  }
  // Eşitlikte OVR, sonra ad: aralık modunda gelen sıra (bant içi gerçek POT) kartı belirlemez.
  const top = players.filter((p) => potentialKey(p) >= 0)
    .sort((a, b) => potentialKey(b) - potentialKey(a) || (b.overall ?? 0) - (a.overall ?? 0) || a.name.localeCompare(b.name, 'tr'))[0]
  if (top) {
    cards.push({ kind: 'TOP_POTENTIAL', player: top, text: `POT ${potText(top)}` })
  }
  const count = players.filter((p) => p.plan && !p.plan.balanced).length
  if (count > 0) {
    cards.push({ kind: 'PLAN_NEEDED', count, text: `${count} oyuncunun planı Dengeli değil` })
  }
  return cards.slice(0, 3)
}
