import type { CareerPlayer } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft } from '../../lib/contract'
import { groupOf, sellAdvice, type PositionGroup, type SellAdvice } from '../../lib/deskRules'
import { slotDepth, YOUTH_MAX_AGE, type DepthSlot } from '../../lib/slotDepth'

/** Kadro Analizi kuralları (KARIYER-UX FAZ 3, 15 §4.2): saf fonksiyonlar, katman 1 (kayıt) girdisi. */

export interface LineupGroups {
  /** Slot sırasıyla dizili oyuncular; `position` slotun mevkisi. */
  starters: { slotId: string; position: string; player: CareerPlayer }[]
  /** Oyuncusu olmayan (ya da oyuncusu kadrodan çıkmış) slotların mevkisi. */
  empty: string[]
  /** Yedek, kapattığı slotun mevkisiyle. */
  bench: { position: string; player: CareerPlayer }[]
  others: CareerPlayer[]
}

/**
 * FCA-3 Diziliş listesi (Stitch: saha solda, liste sağda): İlk 11 · Yedekler · Kadro dışı. Yedekler Derinlik ile aynı veriden (`slotDepth`:
 * /fit/lineup slot.depth[0], sunucu tekil atar; depth yoksa Yedekler boş). Gençler ve kiralıktakiler Kadro dışı. Kadro dışı OVR'ye göre.
 */
export function lineupGroups(slots: DepthSlot[], squad: CareerPlayer[]): LineupGroups {
  const byId = new Map(squad.map((c) => [c.player.id, c]))
  const used = new Set<number>()
  const starters: LineupGroups['starters'] = []
  const empty: string[] = []
  // Aynı oyuncu iki slota yazılmışsa ilk slotta sayılır, ikinci slot boştur.
  slots.forEach((s) => {
    const player = s.playerId !== undefined && !used.has(s.playerId) ? byId.get(s.playerId) : undefined
    if (player) {
      used.add(player.player.id)
      starters.push({ slotId: s.slotId, position: s.position, player })
    } else {
      empty.push(s.position)
    }
  })
  const bench: LineupGroups['bench'] = []
  slotDepth(slots, squad, []).forEach((row) => {
    const entry = row.backup ? byId.get(row.backup.id) : undefined
    if (entry && !used.has(entry.player.id)) {
      used.add(entry.player.id)
      bench.push({ position: row.position, player: entry })
    }
  })
  const others = squad.filter((c) => !used.has(c.player.id)).sort((a, b) => b.player.overall - a.player.overall)
  return { starters, empty, bench, others }
}

/** FCA-3 satır önerisi: Masa "3 iş" ile aynı `sellAdvice`; yalnız Sat ve Süre ver/kirala döner (tut ve kiralıktaki yok). */
export function rowAdvice(squad: CareerPlayer[], starters: Set<number>, tags: Record<number, string>): Map<number, SellAdvice> {
  const out = new Map<number, SellAdvice>()
  squad.forEach((c) => {
    const advice = sellAdvice(c, starters, tags)
    if (advice.kind !== 'KEEP') {
      out.set(c.player.id, advice)
    }
  })
  return out
}

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
