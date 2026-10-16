import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { endpoints } from '../../../api/endpoints'
import { toPlannerObjectives } from '../../../lib/capture'
import { kbToCaptureGroups } from '../../../lib/kbObjectives'
import { parseRequirement, planObjectives, type Objective, type ObjectiveGroup, type Requirement } from '../../../lib/objectives'
import { objectiveStore, useObjectives } from '../../../state/objectiveStore'

export const OBJECTIVE_GROUPS: ObjectiveGroup[] = ['Foundations', 'Milestones', 'Weekly', 'Seasonal', 'Diğer']
export const REQUIREMENT_FORMAT_ERROR = 'Şart satırı biçimi: TÜR:ad:sayı (ör. XI_LEAGUE:Premier League:1) ya da TÜR:sayı (ör. GOALS:3).'

export interface ParentGroup { id: string; name: string; group: string; total: number; done: number; reward: number; expiresAt?: string; items: Objective[] }

export interface ObjectiveInput { name: string; group: ObjectiveGroup; requirements: string; reward: string; sp: string; effort: string; expires: string; web: boolean }

/** Elle objective ekleme: hata metni döner (yoksa ekler). Biçim parseRequirement'te. */
export function addObjective(input: ObjectiveInput): string | undefined {
  const parsed = input.requirements.split('\n').map((l) => l.trim()).filter(Boolean).map(parseRequirement)
  if (!input.name.trim()) {
    return 'Objective adı gerekli.'
  }
  if (parsed.some((p) => !p)) {
    return REQUIREMENT_FORMAT_ERROR
  }
  objectiveStore.add({
    id: `${Date.now()}`,
    name: input.name.trim(),
    group: input.group,
    requirements: parsed as Requirement[],
    rewardValue: Number(input.reward) || 0,
    sp: Number(input.sp) || 0,
    effortMatches: input.effort === '' ? undefined : Number(input.effort),
    webAppDoable: input.web,
    expiresAt: input.expires || undefined,
  })
  return undefined
}

/**
 * UT objective planlayıcı (V3-07c; UtObjectivesPage'den): planlayıcıdaki objective'ler (yakalamadan aktarılan gruplar + elle eklenenler), ana görev
 * grupları (ilerleme, ana ödül, bitiş), önerilen plan ve KB'deki güncel gruplar. v2 ve v3 aynı hook.
 */
export function useUtObjectives() {
  const objectives = useObjectives()
  const plan = useMemo(() => planObjectives(objectives), [objectives])
  const { parents, singles } = useMemo(() => {
    const map = new Map<string, ParentGroup>()
    objectives.filter((o) => o.parentId).forEach((o) => {
      const entry = map.get(o.parentId!) ?? { id: o.parentId!, name: o.parentName ?? 'Grup', group: o.group, total: o.subTotal ?? 0, done: o.subDone ?? 0, reward: o.parentReward ?? 0, expiresAt: o.expiresAt, items: [] }
      entry.items.push(o)
      map.set(o.parentId!, entry)
    })
    map.forEach((e) => e.items.sort((a, b) => (a.subIndex ?? 0) - (b.subIndex ?? 0)))
    return { parents: [...map.values()], singles: objectives.filter((o) => !o.parentId) }
  }, [objectives])
  const kb = useQuery({ queryKey: ['kb-objectives'], queryFn: endpoints.kbObjectives, staleTime: 60_000, retry: false })
  const importKb = () => objectiveStore.replaceImported(toPlannerObjectives(kbToCaptureGroups(kb.data ?? [])))
  return { objectives, plan, parents, singles, kb, importKb }
}
