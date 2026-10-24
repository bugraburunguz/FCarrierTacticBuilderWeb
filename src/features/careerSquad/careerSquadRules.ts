import type { CareerPlayer } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft } from '../../lib/contract'
import { depthRows, GROUP_LABEL, groupCapacity, groupOf, type PositionGroup } from '../../lib/deskRules'

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

/** Derinlik matrisi katmanı: ilk 11 (ana taktik ya da başlangıç önerisi), yedek, genç (≤ 21, ilk 11 dışı). */
export type DepthTier = 'starter' | 'backup' | 'youth'
/** Aciliyet: eksik (asgari derinlik altı) > yedek yok > yalnız genç yedek > yeterli. */
export type DepthUrgency = 'short' | 'no-backup' | 'youth-only' | 'ok'
export const YOUTH_MAX_AGE = 21

export interface GroupRosterPlayer {
  id: number
  name: string
  position: string
  overall: number
  age?: number
  tier: DepthTier
  /** Ana mevkisi bu grupta mı (değilse ikincil mevkiyle kapasiteye katılır). */
  primary: boolean
  /** Başka grupta ilk 11 ise o slotun mevkisi: burada yedek sayılmaz. */
  startsAt?: string
}

export interface GroupRoster {
  group: PositionGroup
  label: string
  have: number
  need: number
  short: number
  urgency: DepthUrgency
  players: GroupRosterPlayer[]
}

/**
 * Derinlik (FAZ 6a-B, tek tanım): grup kapasitesi deskRules.groupCapacity (Masa derinlik işiyle aynı sayı ve eşik); oyuncular reytinge göre.
 * `starters` (oyuncu → ana taktikte oynadığı slotun mevkisi; yoksa başlangıç önerisi) verilirse oyuncu, oynadığı slotun grubunda İlk 11'dir
 * (ana mevkisi başka olsa da). Başka grupta ilk 11 olan oyuncu burada listelenir ama yedek sayılmaz. Verilmezse herkes yedek ya da genç,
 * aciliyet yalnız eksik/yeterli.
 */
export function groupRoster(squad: CareerPlayer[], starters?: ReadonlyMap<number, string>): GroupRoster[] {
  const active = squad.filter((c) => !c.loanedOut)
  const groups = groupCapacity(squad)
  const startGroup = (id: number) => groupOf(starters?.get(id))
  return depthRows(squad).map((row) => {
    const capacity = groups.get(row.group) ?? { primary: [], secondary: [] }
    const members = new Set([...capacity.primary, ...capacity.secondary, ...active.filter((c) => startGroup(c.player.id) === row.group)])
    const players: GroupRosterPlayer[] = [...members]
      .sort((a, b) => b.player.overall - a.player.overall)
      .map((c) => {
        const startsIn = startGroup(c.player.id)
        const tier: DepthTier = startsIn === row.group ? 'starter' : c.player.age !== undefined && c.player.age <= YOUTH_MAX_AGE ? 'youth' : 'backup'
        return {
          id: c.player.id, name: c.player.name, position: c.player.positions[0], overall: c.player.overall, age: c.player.age, tier,
          primary: groupOf(c.player.positions[0]) === row.group,
          startsAt: startsIn !== undefined && startsIn !== row.group ? starters!.get(c.player.id) : undefined,
        }
      })
    const available = players.filter((p) => p.startsAt === undefined)
    const backups = available.filter((p) => p.tier === 'backup').length
    const youth = available.filter((p) => p.tier === 'youth').length
    const urgency: DepthUrgency = row.short > 0 ? 'short'
      : starters === undefined || backups > 0 ? 'ok'
        : youth > 0 ? 'youth-only' : 'no-backup'
    return { ...row, label: GROUP_LABEL[row.group], urgency, players }
  })
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
