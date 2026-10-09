import type { CaptureObjectiveGroup, KbObjectiveGroup } from '../api/types'

/** Herkese açık objective grubunu planlayıcının okuduğu yakalama biçimine çevirir (ilerleme 0, hepsi devam ediyor). */
export function kbToCaptureGroups(groups: KbObjectiveGroup[]): CaptureObjectiveGroup[] {
  return groups.map((g) => ({
    groupId: g.id,
    name: g.name,
    gameMode: g.gameMode,
    status: 'IN_PROGRESS',
    endTime: g.endsAt ? Math.floor(new Date(g.endsAt).getTime() / 1000) : undefined,
    rewards: g.reward ?? [],
    objectives: (g.objectives ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      progress: 0,
      total: o.total,
      status: 'IN_PROGRESS',
      lockedBy: o.lockedBy ?? [],
      rewards: o.rewards ?? [],
    })),
  }))
}
