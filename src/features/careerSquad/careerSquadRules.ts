import type { CareerPlayer } from '../../api/types'
import { CONTRACT_MONTHS, contractMonthsLeft } from '../../lib/contract'
import { depthRows, GROUP_LABEL, groupOf, type PositionGroup } from '../../lib/deskRules'

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

export interface GroupRoster {
  group: PositionGroup
  label: string
  have: number
  need: number
  short: number
  players: { id: number; name: string; position: string; overall: number; age?: number }[]
}

/** Derinlik: mevki grubu başına eldeki/gereken (deskRules.depthRows, Masa derinlik işiyle aynı eşik) ve oyuncular, reytinge göre. */
export function groupRoster(squad: CareerPlayer[]): GroupRoster[] {
  const active = squad.filter((c) => !c.loanedOut)
  return depthRows(squad).map((row) => ({
    ...row,
    label: GROUP_LABEL[row.group],
    players: active
      .filter((c) => groupOf(c.player.positions[0]) === row.group)
      .sort((a, b) => b.player.overall - a.player.overall)
      .map((c) => ({ id: c.player.id, name: c.player.name, position: c.player.positions[0], overall: c.player.overall, age: c.player.age })),
  }))
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
