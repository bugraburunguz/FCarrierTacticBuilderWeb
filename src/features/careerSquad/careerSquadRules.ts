import type { CareerPlayer } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft } from '../../lib/contract'
import { groupOf, type PositionGroup } from '../../lib/deskRules'
import { YOUTH_MAX_AGE, type DepthSlot } from '../../lib/slotDepth'

/** Kadro Analizi kuralları (KARIYER-UX FAZ 3, 15 §4.2): saf fonksiyonlar, katman 1 (kayıt) girdisi. */

const round1 = (value: number) => Math.round(value * 10) / 10

export interface SquadStats {
  avgOverall?: number
  avgAge?: number
  count: number
  loanedOut: number
}

/** Diziliş sekmesi StatTile'ları: ortalama reyting ve yaş kiralık gönderilenler hariç; boş kadroda değer yok. */
export function squadStats(squad: CareerPlayer[]): SquadStats {
  const active = squad.filter((c) => !c.loanedOut)
  const ages = active.flatMap((c) => (c.player.age ? [c.player.age] : []))
  return {
    avgOverall: active.length ? round1(active.reduce((s, c) => s + c.player.overall, 0) / active.length) : undefined,
    avgAge: ages.length ? round1(ages.reduce((s, a) => s + a, 0) / ages.length) : undefined,
    count: squad.length,
    loanedOut: squad.length - active.length,
  }
}

/** Derinlikte "Genç" kolonu ve yaş bandı sınırı (lib/slotDepth ile aynı sayı). */
export { YOUTH_MAX_AGE }

/** Eski `?grup=` bağlantısı → o grubun ilk slot satırı (Masa artık `?slot=` verir). */
export function slotForGroup(slots: DepthSlot[], group: PositionGroup | undefined): string | undefined {
  return group ? slots.find((s) => groupOf(s.position) === group)?.slotId : undefined
}

export interface AgeBand {
  key: 'young' | 'prime' | 'veteran'
  label: string
  range: string
  count: number
  /** Yaşı bilinen aktif oyunculara oranı (0–1). */
  share: number
}

/** Yaş bantları (KARIYER-UX 6, gençleştirme stratejisi): genç ≤ 21, prime 22–29, tecrübeli 30+; kiralık gönderilen ve yaşı bilinmeyen hariç. */
export function ageBands(squad: CareerPlayer[]): AgeBand[] {
  const ages = squad.filter((c) => !c.loanedOut).flatMap((c) => (c.player.age ? [c.player.age] : []))
  const bands: [AgeBand['key'], string, string, number, number][] = [
    ['young', 'Genç', `≤${YOUTH_MAX_AGE}`, 0, YOUTH_MAX_AGE], ['prime', 'Prime', '22–29', 22, 29], ['veteran', 'Tecrübeli', '30+', 30, 99],
  ]
  return bands.map(([key, label, range, lo, hi]) => {
    const count = ages.filter((a) => a >= lo && a <= hi).length
    return { key, label, range, count, share: ages.length === 0 ? 0 : count / ages.length }
  })
}

export interface ContractLane {
  year: string
  players: { id: number; name: string; until: string; months?: number; soon: boolean }[]
}

/** Sözleşme bitiş zaman çizgisi: bitiş yılına göre şeritler, tarihe göre sıralı; ≤ 6 ay kalanlar oyun tarihine göre işaretli. */
export function contractTimeline(squad: CareerPlayer[], gameDate: string | undefined): ContractLane[] {
  const lanes = new Map<string, ContractLane>()
  squad
    .filter((c) => !c.loanedOut && c.player.contractUntil)
    .sort((a, b) => a.player.contractUntil!.localeCompare(b.player.contractUntil!))
    .forEach((c) => {
      const until = c.player.contractUntil!.slice(0, 10)
      const year = until.slice(0, 4)
      const months = contractMonthsLeft(gameDate, until)
      const lane = lanes.get(year) ?? { year, players: [] }
      lane.players.push({ id: c.player.id, name: c.player.name, until, months, soon: months !== undefined && months <= CONTRACT_MONTHS })
      lanes.set(year, lane)
    })
  return [...lanes.values()]
}

const LEGACY_TAB: Record<string, string | undefined> = { saha: undefined, oyuncular: 'liste', hareketler: 'hareketler' }
export const SQUAD_PATH = '/career/squad'

/** Eski /squad adresi (15 §3): sekme eşlenir (saha → dizilis varsayılan, oyuncular → liste); kariyer sekmesi Masa › Ayarlar'a; diğer parametreler kalır. */
export function legacySquadTarget(search: string): string {
  const params = new URLSearchParams(search)
  const tab = params.get('sekme')
  if (tab === 'kariyer') {
    return '/career/dashboard?sekme=ayarlar'
  }
  if (tab !== null) {
    const mapped = tab in LEGACY_TAB ? LEGACY_TAB[tab] : tab
    if (mapped) {
      params.set('sekme', mapped)
    } else {
      params.delete('sekme')
    }
  }
  return params.size ? `${SQUAD_PATH}?${params}` : SQUAD_PATH
}
