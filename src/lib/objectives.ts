export type ObjectiveGroup = 'Foundations' | 'Milestones' | 'Weekly' | 'Seasonal' | 'Diğer'

export type RequirementKind = 'XI_LEAGUE' | 'XI_NATION' | 'XI_CLUB' | 'GOALS' | 'ASSISTS' | 'PLAY_MATCHES' | 'SBC' | 'EVO' | 'SQUAD_ACTION' | 'OTHER'

export interface Requirement {
  kind: RequirementKind
  value?: string
  count: number
}

export interface Objective {
  id: string
  name: string
  group: ObjectiveGroup
  requirements: Requirement[]
  rewardValue: number
  sp: number
  effortMatches?: number
  webAppDoable: boolean
  expiresAt?: string
}

export interface XiRequirement {
  kind: 'XI_LEAGUE' | 'XI_NATION' | 'XI_CLUB'
  value: string
  count: number
}

export interface PlanGroup {
  objectives: Objective[]
  xi: XiRequirement[]
  xiSlots: number
  effortMatches: number
  reward: number
  ratio: number
  earliestExpiry?: string
}

export interface Plan {
  groups: PlanGroup[]
  web: Objective[]
  totalReward: number
}

export const XI_SLOTS = 11
export const SP_VALUE = 50
const MIN_EFFORT = 0.5
const GOALS_PER_MATCH = 2
const ASSISTS_PER_MATCH = 1.5

export const REQUIREMENT_KINDS: RequirementKind[] = ['XI_LEAGUE', 'XI_NATION', 'XI_CLUB', 'GOALS', 'ASSISTS', 'PLAY_MATCHES', 'SBC', 'EVO', 'SQUAD_ACTION', 'OTHER']

export function rewardOf(objective: Objective): number {
  return objective.rewardValue + objective.sp * SP_VALUE
}

export function estimateEffort(objective: Objective): number {
  if (objective.effortMatches !== undefined) {
    return objective.effortMatches
  }
  const efforts = objective.requirements.map((r) => {
    switch (r.kind) {
      case 'PLAY_MATCHES':
        return r.count
      case 'GOALS':
        return Math.ceil(r.count / GOALS_PER_MATCH)
      case 'ASSISTS':
        return Math.ceil(r.count / ASSISTS_PER_MATCH)
      case 'XI_LEAGUE':
      case 'XI_NATION':
      case 'XI_CLUB':
        return 1
      default:
        return 0
    }
  })
  return Math.max(MIN_EFFORT, ...efforts)
}

export function xiRequirements(objective: Objective): XiRequirement[] {
  return objective.requirements.flatMap((r) =>
    (r.kind === 'XI_LEAGUE' || r.kind === 'XI_NATION' || r.kind === 'XI_CLUB') && r.value ? [{ kind: r.kind, value: r.value, count: r.count }] : [],
  )
}

/** Aynı XI'de birlikte sağlanabilmeleri için gereken birleşik şart: her (tür, ad) için en büyük sayı. */
export function mergeXi(lists: XiRequirement[][]): XiRequirement[] {
  const merged = new Map<string, XiRequirement>()
  lists.flat().forEach((r) => {
    const key = `${r.kind}:${r.value.toLowerCase()}`
    const current = merged.get(key)
    merged.set(key, current ? { ...current, count: Math.max(current.count, r.count) } : { ...r })
  })
  return [...merged.values()]
}

/** Birleşik şartın en az kaç slot gerektirdiği: aynı türde farklı adlar toplanır; farklı türler aynı oyuncuyu paylaşabilir. */
export function requiredSlots(xi: XiRequirement[]): number {
  const byKind = new Map<string, number>()
  xi.forEach((r) => byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + r.count))
  return Math.max(0, ...byKind.values())
}

function expiryOf(group: Objective[]): string | undefined {
  const dates = group.flatMap((o) => (o.expiresAt ? [o.expiresAt] : [])).sort()
  return dates[0]
}

function toGroup(members: Objective[]): PlanGroup {
  const xi = mergeXi(members.map(xiRequirements))
  const effort = Math.max(0, ...members.map(estimateEffort))
  const reward = members.reduce((sum, o) => sum + rewardOf(o), 0)
  return {
    objectives: members,
    xi,
    xiSlots: requiredSlots(xi),
    effortMatches: effort,
    reward,
    ratio: reward / Math.max(MIN_EFFORT, effort),
    earliestExpiry: expiryOf(members),
  }
}

function compareGroups(a: PlanGroup, b: PlanGroup): number {
  if (a.earliestExpiry !== b.earliestExpiry) {
    if (!a.earliestExpiry) {
      return 1
    }
    if (!b.earliestExpiry) {
      return -1
    }
    return a.earliestExpiry.localeCompare(b.earliestExpiry)
  }
  return b.ratio - a.ratio
}

/**
 * Plan: web app'te yapılabilenler ayrılır; kalanlar ödül/çaba oranına göre sıralanıp aynı XI ve aynı maçlarla
 * birlikte kapanabilenler gruplanır. Grup çabası üyelerin en büyüğüdür (hedefler maçlar arasında paylaşılır varsayımı).
 * Gruplar süresi dolana göre, sonra orana göre sıralanır.
 */
export function planObjectives(objectives: Objective[]): Plan {
  const web = objectives.filter((o) => o.webAppDoable).sort((a, b) => (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'))
  const playable = objectives
    .filter((o) => !o.webAppDoable)
    .sort((a, b) => rewardOf(b) / Math.max(MIN_EFFORT, estimateEffort(b)) - rewardOf(a) / Math.max(MIN_EFFORT, estimateEffort(a)))
  const members: Objective[][] = []
  playable.forEach((objective) => {
    const target = members.find((group) => requiredSlots(mergeXi([...group.map(xiRequirements), xiRequirements(objective)])) <= XI_SLOTS)
    if (target) {
      target.push(objective)
    } else {
      members.push([objective])
    }
  })
  const groups = members.map(toGroup).sort(compareGroups)
  const totalReward = objectives.reduce((sum, o) => sum + rewardOf(o), 0)
  return { groups, web, totalReward }
}

/** "XI_LEAGUE:Premier League:1" biçimindeki satırı çözer; tür:ad:sayı ya da tür:sayı kabul edilir. */
export function parseRequirement(line: string): Requirement | undefined {
  const parts = line.split(':').map((p) => p.trim()).filter(Boolean)
  const kind = parts[0] as RequirementKind
  if (!REQUIREMENT_KINDS.includes(kind)) {
    return undefined
  }
  if (parts.length === 2) {
    const count = Number(parts[1])
    return Number.isFinite(count) ? { kind, count } : undefined
  }
  if (parts.length >= 3) {
    const count = Number(parts[parts.length - 1])
    return Number.isFinite(count) ? { kind, value: parts.slice(1, -1).join(':'), count } : undefined
  }
  return undefined
}

const XI_LABEL: Record<XiRequirement['kind'], string> = { XI_LEAGUE: 'lig', XI_NATION: 'ülke', XI_CLUB: 'kulüp' }

export function xiToText(xi: XiRequirement[]): string {
  return xi.map((r) => `${XI_LABEL[r.kind]}:${r.value}=${r.count}`).join('; ')
}

export interface ParsedXi {
  league: Record<string, number>
  nationality: Record<string, number>
  club: Record<string, number>
}

/** "lig:Premier League=1; ülke:Brazil=2; kulüp:Arsenal=1" biçimini çözer. */
export function parseXiText(text: string): ParsedXi {
  const result: ParsedXi = { league: {}, nationality: {}, club: {} }
  const keys: Record<string, keyof ParsedXi> = { lig: 'league', ülke: 'nationality', kulüp: 'club' }
  text.split(';').map((p) => p.trim()).filter(Boolean).forEach((part) => {
    const match = /^(lig|ülke|kulüp):(.+)=(\d+)$/.exec(part)
    if (match) {
      result[keys[match[1]]][match[2].trim()] = Number(match[3])
    }
  })
  return result
}
