import type { CareerPlayer, SlotAssignment } from '../api/types'

/** Kariyer "Menajer Masası" kuralları (13 §3.1, §5): saf fonksiyonlar, sunucuya gitmeden masada gösterilir; her öneri gerekçelidir. */

export type PositionGroup = 'GK' | 'CB' | 'FB' | 'MID' | 'W' | 'ST'

const GROUP_OF: Record<string, PositionGroup> = {
  GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST',
}
export const GROUP_LABEL: Record<PositionGroup, string> = { GK: 'Kaleci', CB: 'Stoper', FB: 'Bek', MID: 'Orta saha', W: 'Kanat', ST: 'Forvet' }
const MIN_DEPTH: Record<PositionGroup, number> = { GK: 2, CB: 3, FB: 3, MID: 4, W: 2, ST: 2 }

const WEAK_FIT = 70
const SELL_AGE = 29
const LOAN_MAX_AGE = 21
const LOAN_MIN_GAP = 6

export interface DepthRow {
  group: PositionGroup
  have: number
  need: number
  short: number
}

export function groupOf(position?: string): PositionGroup | undefined {
  return position ? GROUP_OF[position] : undefined
}

export function ageProfile(squad: CareerPlayer[]): { average: number; buckets: { label: string; count: number }[] } {
  const ages = squad.flatMap((c) => (c.player.age ? [c.player.age] : []))
  const edges: [string, number, number][] = [['≤20', 0, 20], ['21-23', 21, 23], ['24-26', 24, 26], ['27-29', 27, 29], ['30+', 30, 99]]
  return {
    average: ages.length === 0 ? 0 : Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10,
    buckets: edges.map(([label, lo, hi]) => ({ label, count: ages.filter((a) => a >= lo && a <= hi).length })),
  }
}

/** Mevki grubu başına eldeki oyuncu sayısı ve beklenen asgari derinlik (ana mevkiye göre). */
export function depthRows(squad: CareerPlayer[]): DepthRow[] {
  const counts = new Map<PositionGroup, number>()
  squad.filter((c) => !c.loanedOut).forEach((c) => {
    const group = groupOf(c.player.positions[0])
    if (group) {
      counts.set(group, (counts.get(group) ?? 0) + 1)
    }
  })
  return (Object.keys(MIN_DEPTH) as PositionGroup[]).map((group) => {
    const have = counts.get(group) ?? 0
    return { group, have, need: MIN_DEPTH[group], short: Math.max(0, MIN_DEPTH[group] - have) }
  })
}

export interface WeakSlot {
  slotId: string
  position: string
  roleId: string
  playerName?: string
  fit: number
}

/** Düşük RoleFit'li ilk 11 slotları (zayıf halkalar), en zayıf başta. */
export function weakSlots(slots: SlotAssignment[]): WeakSlot[] {
  return slots
    .filter((s) => (s.roleFit?.score ?? 0) < WEAK_FIT)
    .map((s) => ({ slotId: s.slotId, position: s.position, roleId: s.roleId, playerName: s.playerName, fit: Math.round(s.roleFit?.score ?? 0) }))
    .sort((a, b) => a.fit - b.fit)
}

export type ActionKind = 'FILL' | 'SELL' | 'LOAN' | 'DEPTH'

export interface DeskAction {
  kind: ActionKind
  title: string
  reason: string
  to: string
  priority: number
}

interface ActionInput {
  squad: CareerPlayer[]
  slots: SlotAssignment[]
  tags: Record<number, string>
}

const money = (value?: number) => (value === undefined ? '—' : value >= 1_000_000 ? `€${(value / 1_000_000).toFixed(1)}M` : `€${Math.round(value / 1000)}K`)

/** "Bu dönemin 3 işi": SquadFit artışı, satış değeri ve genç gelişimi kurallarıyla en etkili üç eylem. */
export function suggestActions({ squad, slots, tags }: ActionInput): DeskAction[] {
  const starters = new Set(slots.flatMap((s) => (s.playerId ? [s.playerId] : [])))
  const actions: DeskAction[] = []

  weakSlots(slots).slice(0, 2).forEach((w, index) => {
    actions.push({
      kind: 'FILL',
      title: `${w.position}: zayıf halka (RoleFit %${w.fit})`,
      reason: `${w.playerName ?? 'Slot'} bu rolü ${w.fit < 55 ? 'oynayamıyor' : 'sınırda oynuyor'}; adayları Transfer Merkezi'nde gör.`,
      to: `/career/transfer?pos=${w.position}&role=${w.roleId}`,
      priority: 100 - w.fit - index,
    })
  })

  squad
    .filter((c) => !c.loanedOut && !starters.has(c.player.id))
    .forEach((c) => {
      const age = c.player.age ?? 0
      const gap = (c.player.potential ?? c.player.overall) - c.player.overall
      if (tags[c.player.id] === 'FOR_SALE' || (age >= SELL_AGE && (c.player.valueEur ?? 0) > 0)) {
        actions.push({
          kind: 'SELL',
          title: `Sat: ${c.player.name}`,
          reason: `${age} yaşında, ilk 11'de değil, tahmini değer ${money(c.player.valueEur)}${tags[c.player.id] === 'FOR_SALE' ? ' (satılık işaretli)' : ''}.`,
          to: `/career/transfer?sell=${c.player.id}`,
          priority: 40 + (tags[c.player.id] === 'FOR_SALE' ? 25 : 0) + Math.min(20, (c.player.valueEur ?? 0) / 1_000_000),
        })
      } else if (age > 0 && age <= LOAN_MAX_AGE && gap >= LOAN_MIN_GAP && tags[c.player.id] !== 'LOCKED') {
        actions.push({
          kind: 'LOAN',
          title: `Süre ver ya da kirala: ${c.player.name}`,
          reason: `${age} yaşında, potansiyeli ${gap} puan üstünde ama ilk 11'de değil.`,
          to: `/career/growth?player=${c.player.id}`,
          priority: 30 + gap,
        })
      }
    })

  depthRows(squad).filter((d) => d.short > 0).forEach((d) => {
    actions.push({
      kind: 'DEPTH',
      title: `Derinlik: ${GROUP_LABEL[d.group]} ${d.have}/${d.need}`,
      reason: `${GROUP_LABEL[d.group]} grubunda ${d.short} oyuncu eksik; sakatlık ve rotasyonda açık kalır.`,
      to: `/career/transfer?group=${d.group}`,
      priority: 20 + d.short * 5,
    })
  })

  return actions.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

export interface DeskAlert {
  tone: 'warn' | 'info'
  text: string
}

/** Uyarı kuralları (13 §3.1): potansiyele ulaşan, düşüşte yaşlanan, derinlik açığı, dönem sonu. */
export function alerts(input: ActionInput & { diffRows: { kind: string; playerId: number; name: string; overallFrom?: number; overallTo?: number }[]; windowEndsOn?: string; today?: Date }): DeskAlert[] {
  const result: DeskAlert[] = []
  input.squad.forEach((c) => {
    if (c.player.potential !== undefined && c.player.overall >= c.player.potential && (c.player.age ?? 99) <= 24) {
      result.push({ tone: 'info', text: `${c.player.name} potansiyeline ulaştı (${c.player.overall}/${c.player.potential}).` })
    }
  })
  input.diffRows.filter((r) => r.kind === 'CHANGED' && (r.overallTo ?? 0) < (r.overallFrom ?? 0)).forEach((r) => {
    const player = input.squad.find((c) => c.player.id === r.playerId)
    if (player && (player.player.age ?? 0) >= 30) {
      result.push({ tone: 'warn', text: `${r.name} (${player.player.age}) düşüşte: ${r.overallFrom} → ${r.overallTo}.` })
    }
  })
  depthRows(input.squad).filter((d) => d.short > 0).forEach((d) => result.push({ tone: 'warn', text: `${GROUP_LABEL[d.group]} derinliği ${d.have}/${d.need}.` }))
  if (input.windowEndsOn) {
    const left = Math.ceil((new Date(input.windowEndsOn).getTime() - (input.today ?? new Date()).getTime()) / 86_400_000)
    if (left >= 0 && left <= 14) {
      result.push({ tone: 'warn', text: `Transfer dönemi ${left} gün içinde kapanıyor.` })
    }
  }
  return result
}
