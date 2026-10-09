import type { SbcRequirement } from '../api/types'

export interface ParsedChallengeText {
  requirements: SbcRequirement[]
  /** Tanınmayan satırlar: yönetici elle düzeltir. */
  unknown: string[]
}

const QUALITY = { bronze: 1, silver: 2, gold: 3 } as const
const OPS = { min: 'MIN', max: 'MAX', exactly: 'EXACT', exact: 'EXACT' } as const

type Counted = { kind: string; pattern: RegExp }

const COUNTED: Counted[] = [
  { kind: 'SAME_NATION', pattern: /same nation count/i },
  { kind: 'SAME_LEAGUE', pattern: /same league count/i },
  { kind: 'SAME_CLUB', pattern: /same club count/i },
  { kind: 'NATION_COUNT', pattern: /nations? in squad/i },
  { kind: 'LEAGUE_COUNT', pattern: /leagues? in squad/i },
  { kind: 'CLUB_COUNT', pattern: /clubs? in squad/i },
]

function operator(text: string): SbcRequirement['op'] | undefined {
  const word = /(min|max|exactly|exact)/i.exec(text)?.[1]?.toLowerCase() as keyof typeof OPS | undefined
  return word ? OPS[word] : undefined
}

/**
 * EA Web App'in SBC ekranından kopyalanan İngilizce şart metnini normalleştirilmiş şartlara çevirir (DATA-07).
 * Örn. "Min. Team Rating: 83", "Players from Premier League: Min 2", "Same Club Count: Max 3", "Player Quality: Min Silver".
 * Kulüp/lig/ülke şartında tür için "Club:"/"League:"/"Nation:" öneki yazılabilir (yoksa lig varsayılır); kimlikler yönetici tarafından eşleştirilir.
 */
export function parseChallengeText(text: string): ParsedChallengeText {
  const requirements: SbcRequirement[] = []
  const unknown: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      continue
    }
    const number = /(\d+)\s*$/.exec(line)?.[1] ?? /(\d+)/.exec(line)?.[1]
    const op = operator(line)
    if (/team rating/i.test(line) && number) {
      requirements.push({ kind: 'TEAM_RATING', op: op ?? 'MIN', value: Number(number) })
    } else if (/(team )?chemistry/i.test(line) && number) {
      requirements.push({ kind: 'CHEMISTRY', op: op ?? 'MIN', value: Number(number) })
    } else if (/player quality/i.test(line)) {
      const quality = /(bronze|silver|gold)/i.exec(line)?.[1]?.toLowerCase() as keyof typeof QUALITY | undefined
      quality ? requirements.push({ kind: 'QUALITY', op: op ?? 'MIN', value: QUALITY[quality] }) : unknown.push(line)
    } else if (/^players? from/i.test(line) && number) {
      const named = /from\s+(?:(club|league|nation)\s*:\s*)?(.+?)\s*:/i.exec(line)
      if (named) {
        const kind = (named[1] ?? 'league').toUpperCase()
        requirements.push({ kind: 'FROM', op: op ?? 'MIN', value: Number(number), refs: [{ kind, id: 0, name: named[2].trim() }] })
      } else {
        unknown.push(line)
      }
    } else {
      const counted = COUNTED.find((c) => c.pattern.test(line))
      if (counted && number) {
        requirements.push({ kind: counted.kind, op: op ?? 'MIN', value: Number(number) })
      } else if (!/# of players|number of players|players in (the )?squad/i.test(line)) {
        unknown.push(line)
      }
    }
  }
  return { requirements, unknown }
}
