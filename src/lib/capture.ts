import type { CaptureCard, CaptureObjectiveGroup, CaptureReward, SbcPoolEntry, SbcRarity } from '../api/types'
import type { Objective, ObjectiveGroup, Requirement } from './objectives'

const MAX_POOL_ENTRIES = 120
const MIN_RATING = 45

function coinValue(rewards: CaptureReward[]): number {
  return rewards.filter((r) => r.type?.toLowerCase() === 'coin').reduce((sum, r) => sum + (r.value ?? 0) * r.count, 0)
}

function groupOf(name = ''): ObjectiveGroup {
  const lower = name.toLowerCase()
  if (lower.includes('foundation')) {
    return 'Foundations'
  }
  if (lower.includes('milestone')) {
    return 'Milestones'
  }
  if (lower.includes('weekly')) {
    return 'Weekly'
  }
  return lower.includes('season') ? 'Seasonal' : 'Diğer'
}

function requirementOf(text: string, remaining: number): Requirement {
  const lower = text.toLowerCase()
  if (/\bgoals?\b/.test(lower)) {
    return { kind: 'GOALS', count: remaining }
  }
  if (/\bassists?\b/.test(lower)) {
    return { kind: 'ASSISTS', count: remaining }
  }
  if (/\b(play|win|match|matches)\b/.test(lower)) {
    return { kind: 'PLAY_MATCHES', count: remaining }
  }
  if (/\bsbc\b|squad building/.test(lower)) {
    return { kind: 'SBC', count: remaining }
  }
  return /\bevolution/.test(lower) ? { kind: 'EVO', count: remaining } : { kind: 'OTHER', count: remaining }
}

/** Maç gerektirmeyen (squad yönetimi, SBC, Evo, paket) objective'ler için sezgisel işaret; kesin değildir. */
function looksWebDoable(text: string): boolean {
  return /\b(sbc|evolution|apply|chem style|formation|open|pack|change|set your|swap)\b/i.test(text)
}

function isoDate(epochSeconds?: number): string | undefined {
  if (!epochSeconds || epochSeconds < 1_000_000_000 || epochSeconds > 4_000_000_000) {
    return undefined
  }
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10)
}

export interface ObjectiveImportOptions {
  gameModes?: string[]
}

/** Yakalanan objective'leri planlayıcı biçimine çevirir: devam edenler, kilidi açık olanlar, kalan ilerlemeyle. */
export function toPlannerObjectives(groups: CaptureObjectiveGroup[], options: ObjectiveImportOptions = {}): Objective[] {
  const done = new Set(groups.flatMap((g) => g.objectives.filter((o) => o.status === 'COMPLETED' || o.status === 'CLAIMED').map((o) => o.id)))
  const result: Objective[] = []
  groups
    .filter((g) => !options.gameModes || options.gameModes.length === 0 || (g.gameMode && options.gameModes.includes(g.gameMode)))
    .forEach((group) => {
      group.objectives.forEach((o) => {
        const remaining = o.total - o.progress
        const unlocked = o.lockedBy.every((id) => done.has(id))
        if (o.status !== 'IN_PROGRESS' || remaining <= 0 || !unlocked) {
          return
        }
        const text = `${o.name ?? ''} ${o.description ?? ''}`
        result.push({
          id: `${group.groupId}-${o.id}`,
          name: `${group.name ?? 'Grup'}: ${o.name ?? o.id}`,
          group: groupOf(group.name),
          requirements: [requirementOf(text, remaining)],
          rewardValue: coinValue(o.rewards),
          sp: 0,
          webAppDoable: looksWebDoable(text),
          expiresAt: isoDate(group.endTime),
        })
      })
    })
  return result
}

function rarityOf(card: CaptureCard): SbcRarity {
  if (card.cardType === 'ICON') {
    return 'ICON'
  }
  if (card.cardType === 'HERO') {
    return 'HERO'
  }
  return /team of the week|in-?form|totw/i.test(card.rarity ?? '') ? 'TOTW' : 'REGULAR'
}

/** Kulüp kartlarını (rating, tür, untradeable) gruplayıp SBC çözücü havuzuna çevirir; fiyat = pazar ortalaması ya da son satış. */
export function toSbcPool(cards: CaptureCard[]): SbcPoolEntry[] {
  const groups = new Map<string, { entry: SbcPoolEntry; prices: number[] }>()
  cards.filter((c) => c.rating >= MIN_RATING).forEach((card) => {
    const rarity = rarityOf(card)
    const key = `${card.rating}|${rarity}|${card.untradeable}`
    const group = groups.get(key) ?? { entry: { rating: card.rating, rarity, count: 0, untradeable: card.untradeable }, prices: [] }
    group.entry.count += 1
    const price = card.marketAverage ?? card.lastSalePrice ?? card.marketMin
    if (price) {
      group.prices.push(price)
    }
    groups.set(key, group)
  })
  return [...groups.values()]
    .map(({ entry, prices }) => ({
      ...entry,
      priceEach: entry.untradeable || prices.length === 0 ? undefined : Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_POOL_ENTRIES)
}
