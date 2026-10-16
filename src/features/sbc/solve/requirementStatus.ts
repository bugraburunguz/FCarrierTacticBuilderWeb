import type { SbcRequirement } from '../../../api/types'
import { squadChemistry } from '../../../lib/chemistry'
import { QUALITY_LABELS, qualityOf, teamRating, type SbcCandidate } from '../../../lib/sbcTraditional'

export type RequirementState = 'ok' | 'fail' | 'unknown'

export interface RequirementStatus {
  requirement: SbcRequirement
  state: RequirementState
  /** ✗ için sebep ("Kimya 22/25"); ? için neden doğrulanamadığı. */
  reason?: string
}

const KEY = { CLUB: 'club', LEAGUE: 'league', NATION: 'nationality' } as const
const LABEL = { club: 'kulüp', league: 'lig', nationality: 'ülke' } as const

function compare(op: string, have: number, want: number): boolean | undefined {
  return op === 'MIN' ? have >= want : op === 'MAX' ? have <= want : op === 'EXACT' ? have === want : undefined
}

function largest(cards: SbcCandidate[], key: 'club' | 'league' | 'nationality'): number {
  const counts = new Map<string, number>()
  cards.forEach((c) => c[key] && counts.set(c[key]!, (counts.get(c[key]!) ?? 0) + 1))
  return Math.max(0, ...counts.values())
}

const distinct = (cards: SbcCandidate[], key: 'club' | 'league' | 'nationality') => new Set(cards.map((c) => c[key]).filter(Boolean)).size

/**
 * Gereksinim çipleri: planlanan 11'e göre ✓ sağlanıyor / ✗ sağlanmıyor (sebep "Kimya 22/25") / ? doğrulanamadı.
 * ? : anlamı doğrulanmamış (PLAYER_ATTRIBUTE, ACADEMY_SLOTTING), tanınmayan (UNKNOWN) ve kart verisinden ölçülemeyen tipler
 * (nadirlik grubu, ticaret durumu, ilk sahip, efsane, takım yıldızı) ile adı çözülemeyen kulüp/lig/ülke şartı.
 */
export function requirementStatuses(requirements: SbcRequirement[], picks: (SbcCandidate | undefined)[], slots: { position: string }[]): RequirementStatus[] {
  const cards = picks.filter((p): p is SbcCandidate => Boolean(p))
  const complete = cards.length === slots.length
  const chem = squadChemistry(slots.map((s, i) => ({ position: s.position, card: picks[i] })))
  return requirements.map((r) => {
    const want = r.value ?? 0
    const judge = (have: number, label: string, target: number = want): RequirementStatus => {
      const ok = compare(r.op, have, target)
      return ok === undefined ? { requirement: r, state: 'unknown', reason: 'Şart yönü doğrulanamadı' } : { requirement: r, state: ok ? 'ok' : 'fail', reason: ok ? undefined : `${label} ${have}/${target}` }
    }
    switch (r.kind) {
      case 'TEAM_RATING':
        return complete ? judge(teamRating(cards.map((c) => c.overall)), 'Takım reytingi') : { requirement: r, state: 'fail', reason: `Kadro ${cards.length}/${slots.length}` }
      case 'CHEMISTRY':
        return judge(chem.total, 'Kimya')
      case 'CHEMISTRY_PER_PLAYER':
        return judge(Math.min(...chem.perSlot.map((c) => c ?? 0)), 'Oyuncu başı en düşük kimya')
      case 'SAME_CLUB':
      case 'SAME_LEAGUE':
      case 'SAME_NATION': {
        const key = r.kind === 'SAME_CLUB' ? 'club' : r.kind === 'SAME_LEAGUE' ? 'league' : 'nationality'
        return judge(largest(cards, key), `Aynı ${LABEL[key]}`)
      }
      case 'CLUB_COUNT':
      case 'LEAGUE_COUNT':
      case 'NATION_COUNT': {
        const key = r.kind === 'CLUB_COUNT' ? 'club' : r.kind === 'LEAGUE_COUNT' ? 'league' : 'nationality'
        return judge(distinct(cards, key), `Farklı ${LABEL[key]}`)
      }
      case 'QUALITY': {
        const qualities = cards.map((c) => qualityOf(c.overall))
        const have = r.op === 'MAX' ? Math.max(0, ...qualities) : Math.min(3, ...qualities)
        const ok = compare(r.op, have, want)
        return ok === undefined ? { requirement: r, state: 'unknown', reason: 'Şart yönü doğrulanamadı' }
          : { requirement: r, state: ok ? 'ok' : 'fail', reason: ok ? undefined : `Kalite ${QUALITY_LABELS[have as 1 | 2 | 3] ?? have}/${QUALITY_LABELS[want as 1 | 2 | 3] ?? want}` }
      }
      case 'LEVEL_COUNT':
        return judge(cards.filter((c) => qualityOf(c.overall) >= (r.level ?? 1)).length, `${QUALITY_LABELS[(r.level ?? 1) as 1 | 2 | 3] ?? 'Seviye'} oyuncu`)
      case 'FROM': {
        const refs = r.refs ?? []
        if (refs.length === 0 || refs.some((x) => !x.name)) {
          return { requirement: r, state: 'unknown', reason: 'Kulüp/lig/ülke adı çözülemedi' }
        }
        const have = cards.filter((c) => refs.some((x) => {
          const key = KEY[x.kind as keyof typeof KEY]
          return key !== undefined && c[key] === x.name
        })).length
        return judge(have, refs.map((x) => x.name).join(' / '))
      }
      case 'PLAYER_COUNT':
        return judge(cards.length, 'Oyuncu')
      case 'MIN_OVR':
      case 'MAX_OVR':
      case 'EXACT_OVR': {
        const fits = (o: number) => (r.kind === 'MIN_OVR' ? o >= want : r.kind === 'MAX_OVR' ? o <= want : o === want)
        return judge(cards.filter((c) => fits(c.overall)).length, `${want} OVR şartına uyan`, r.count ?? 1)
      }
      default:
        return { requirement: r, state: 'unknown', reason: r.kind === 'UNKNOWN' ? 'Bilinmeyen şart: doğrulanamadı' : 'Kart verisinden doğrulanamıyor' }
    }
  })
}
