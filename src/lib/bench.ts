import type { CareerPlayer, SquadFit } from '../api/types'

export const BENCH_SIZE = 7

export interface BenchEntry {
  player: CareerPlayer
  covers: { slotId: string; score: number }[]
}

/**
 * İlk 11 dışındaki oyunculardan 7 kişilik yedek kulübesi: önce bir yedek kaleci, sonra slot başına en iyi
 * yedekleri (depth) en çok kapsayan oyuncular. Her yedekte hangi slotların yedeği olduğu görünür.
 */
export function pickBench(squad: CareerPlayer[], fit: SquadFit, size = BENCH_SIZE): BenchEntry[] {
  const starters = new Set(fit.slots.map((s) => s.playerId))
  const byId = new Map(squad.map((p) => [p.player.id, p]))
  const coverage = new Map<number, { slotId: string; score: number }[]>()
  fit.slots.forEach((slot) =>
    slot.depth.forEach((d) => {
      coverage.set(d.playerId, [...(coverage.get(d.playerId) ?? []), { slotId: slot.slotId, score: d.roleFitScore }])
    }),
  )
  const available = squad.filter((p) => !starters.has(p.player.id))
  const chosen: CareerPlayer[] = []
  const keeper = available
    .filter((p) => p.player.positions.includes('GK'))
    .sort((a, b) => b.player.overall - a.player.overall)[0]
  if (keeper) {
    chosen.push(keeper)
  }
  const covered = new Set<string>()
  while (chosen.length < size) {
    const next = available
      .filter((p) => !chosen.includes(p) && !p.player.positions.includes('GK'))
      .map((p) => {
        const cover = coverage.get(p.player.id) ?? []
        const fresh = cover.filter((c) => !covered.has(c.slotId))
        return { p, value: fresh.length * 100 + fresh.reduce((s, c) => s + c.score, 0) + p.player.overall / 100 }
      })
      .sort((a, b) => b.value - a.value)[0]
    if (!next) {
      break
    }
    chosen.push(next.p)
    ;(coverage.get(next.p.player.id) ?? []).forEach((c) => covered.add(c.slotId))
  }
  return chosen.map((player) => ({ player: byId.get(player.player.id) ?? player, covers: (coverage.get(player.player.id) ?? []).sort((a, b) => b.score - a.score) }))
}
