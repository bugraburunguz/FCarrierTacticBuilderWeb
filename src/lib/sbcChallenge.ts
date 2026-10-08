import type { Formation, SbcChallenge, SbcRequirement } from '../api/types'
import { QUALITY_LABELS, type SbcConstraints } from './sbcTraditional'

const OP_WORD = { MIN: 'en az', MAX: 'en çok', EXACT: 'tam' } as const
const REF_LABEL = { CLUB: 'kulüp', LEAGUE: 'lig', NATION: 'ülke' } as const

const qualityName = (level?: number) => QUALITY_LABELS[(level ?? 1) as 1 | 2 | 3] ?? `seviye ${level}`

/** Şartı okunur Türkçe metne çevirir; kulüp/lig/ülke adı çözülemediyse kimlikle gösterir. */
export function describeRequirement(r: SbcRequirement): string {
  const op = OP_WORD[r.op as keyof typeof OP_WORD] ?? r.op
  switch (r.kind) {
    case 'TEAM_RATING':
      return `Takım rating'i ${op} ${r.value}`
    case 'CHEMISTRY':
      return `Kimya ${op} ${r.value}`
    case 'SAME_CLUB':
      return `Aynı kulüpten ${op} ${r.value} oyuncu`
    case 'SAME_LEAGUE':
      return `Aynı ligden ${op} ${r.value} oyuncu`
    case 'SAME_NATION':
      return `Aynı ülkeden ${op} ${r.value} oyuncu`
    case 'CLUB_COUNT':
      return `${op} ${r.value} farklı kulüp`
    case 'LEAGUE_COUNT':
      return `${op} ${r.value} farklı lig`
    case 'NATION_COUNT':
      return `${op} ${r.value} farklı ülke`
    case 'QUALITY':
      return `Oyuncular ${op} ${qualityName(r.value)} kalitede`
    case 'LEVEL_COUNT':
      return `${op} ${r.value} ${qualityName(r.level)} (ya da üstü) oyuncu`
    case 'FROM': {
      const names = (r.refs ?? []).map((x) => x.name ?? `${REF_LABEL[x.kind as keyof typeof REF_LABEL] ?? x.kind} #${x.id}`).join(' / ')
      return `${names} içinden ${op} ${r.value} oyuncu`
    }
    default:
      return `Şart: ${r.kind.replace('UNKNOWN:', '')} ${op} ${r.value ?? ''}`.trim()
  }
}

export interface ChallengeSetup {
  formationId?: string
  teamRatingMin: number
  chemMin: number
  extra: Partial<SbcConstraints>
  /** Çözücünün zorlayamadığı (çözülemeyen ad, tanınmayan şart) maddeler. */
  notes: string[]
}

const FORMATION_ALIASES: Record<string, string> = {}

export function findChallengeFormation(label: string | undefined, formations: Formation[]): Formation | undefined {
  if (!label) {
    return undefined
  }
  const key = FORMATION_ALIASES[label] ?? label
  return formations.find((f) => f.id === key) ?? formations.find((f) => f.id.startsWith(`${key} `)) ?? formations.find((f) => (f.label ?? '').startsWith(key))
}

/** Normalleştirilmiş SBC şartlarını çözücünün kısıtlarına çevirir. */
export function challengeSetup(challenge: SbcChallenge, formations: Formation[]): ChallengeSetup {
  const extra: Partial<SbcConstraints> = {}
  const notes: string[] = []
  let teamRatingMin = 0
  let chemMin = 0
  const max: NonNullable<SbcConstraints['max']> = {}
  const minDistinct: NonNullable<SbcConstraints['minDistinct']> = {}
  const levelCounts: NonNullable<SbcConstraints['levelCounts']> = []
  const fromAny: NonNullable<SbcConstraints['fromAny']> = []
  for (const r of challenge.requirements) {
    const value = r.value ?? 0
    switch (r.kind) {
      case 'TEAM_RATING':
        teamRatingMin = Math.max(teamRatingMin, r.op === 'MAX' ? 0 : value)
        break
      case 'CHEMISTRY':
        chemMin = Math.max(chemMin, r.op === 'MAX' ? 0 : value)
        break
      case 'SAME_CLUB':
        r.op === 'MAX' ? (max.sameClub = value) : (extra.minSameClub = value)
        break
      case 'SAME_LEAGUE':
        r.op === 'MAX' ? (max.sameLeague = value) : (extra.minSameLeague = value)
        break
      case 'SAME_NATION':
        r.op === 'MAX' ? (max.sameNation = value) : (extra.minSameNation = value)
        break
      case 'CLUB_COUNT':
        r.op === 'MAX' ? (max.clubs = value) : (minDistinct.clubs = value)
        break
      case 'LEAGUE_COUNT':
        r.op === 'MAX' ? (max.leagues = value) : (minDistinct.leagues = value)
        break
      case 'NATION_COUNT':
        r.op === 'MAX' ? (max.nations = value) : (minDistinct.nations = value)
        break
      case 'QUALITY':
        if (r.op === 'MIN' && value >= 1 && value <= 3) {
          extra.minQuality = value as 1 | 2 | 3
        } else {
          notes.push(describeRequirement(r))
        }
        break
      case 'LEVEL_COUNT':
        if (r.op === 'MIN' && r.level && r.level >= 1 && r.level <= 3) {
          levelCounts.push({ level: r.level as 1 | 2 | 3, min: value })
        } else {
          notes.push(describeRequirement(r))
        }
        break
      case 'FROM': {
        const refs = r.refs ?? []
        const names = refs.map((x) => x.name).filter((n): n is string => Boolean(n))
        const kind = refs[0]?.kind === 'LEAGUE' ? 'league' : refs[0]?.kind === 'NATION' ? 'nationality' : 'club'
        if (r.op !== 'MIN' || names.length === 0) {
          notes.push(describeRequirement(r))
        } else {
          fromAny.push({ kind, names, min: value })
          if (names.length < refs.length) {
            notes.push(`${describeRequirement(r)} (bazı adlar çözülemedi, yalnızca bilinenler zorlanır)`)
          }
        }
        break
      }
      default:
        notes.push(describeRequirement(r))
    }
  }
  if (Object.keys(max).length > 0) {
    extra.max = max
  }
  if (Object.keys(minDistinct).length > 0) {
    extra.minDistinct = minDistinct
  }
  if (levelCounts.length > 0) {
    extra.levelCounts = levelCounts
  }
  if (fromAny.length > 0) {
    extra.fromAny = fromAny
  }
  return { formationId: findChallengeFormation(challenge.formationLabel, formations)?.id, teamRatingMin, chemMin, extra, notes }
}
