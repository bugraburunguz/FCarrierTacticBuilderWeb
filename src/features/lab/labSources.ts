import type { QueryClient } from '@tanstack/react-query'
import { endpoints } from '../../api/endpoints'
import type { ReplicaApplyResult, ReplicaBuildUp, ReplicaSummary, TacticCodeImport } from '../../api/types'
import type { Lineup, TacticState, TeamSetupState } from '../../lib/tactic'
import { labStore } from '../../state/labStore'

/** Lab taslağının kaynakları (KARIYER-UX FAZ 4b, 15 §4.3): replika ve EA kodu tek taktik modeline (TacticState) çevrilir; taslak labStore'da açılır. */

const BUILD_UP: Record<ReplicaBuildUp, TeamSetupState['buildUp']> = { SHORT_PASSING: 'Short', BALANCED: 'Balanced', COUNTER: 'Counter' }
const CODE_BUILD_UPS: readonly TeamSetupState['buildUp'][] = ['Short', 'Balanced', 'Counter']
const APPLY_STALE_MS = 60_000

export function tacticFromReplica(r: Pick<ReplicaSummary, 'formationId' | 'buildUp' | 'lineHeight' | 'slots'>): TacticState {
  return {
    formation: r.formationId,
    setup: { buildUp: BUILD_UP[r.buildUp], depth: r.lineHeight },
    slots: Object.fromEntries(r.slots.map((s) => [s.slotId, { tags: [], roleId: s.roleId }])),
  }
}

/** Replika "Kadromla uygula" sonucu (kariyer kadrosu, useReplicaApply ile aynı istek) → diziliş. */
export function lineupFromApply(result: Pick<ReplicaApplyResult, 'slots'>): Lineup {
  return Object.fromEntries(result.slots.flatMap((s) => (s.player ? [[s.slotId, s.player.id]] : [])))
}

export function tacticFromCode(r: Pick<TacticCodeImport, 'formation' | 'buildUp' | 'depth' | 'slots'>): TacticState {
  const buildUp = (CODE_BUILD_UPS as readonly string[]).includes(r.buildUp) ? (r.buildUp as TeamSetupState['buildUp']) : 'Balanced'
  return { formation: r.formation, setup: { buildUp, depth: r.depth }, slots: Object.fromEntries(r.slots.map((s) => [s.slotId, { tags: [], roleId: s.roleId }])) }
}

export type CloneResult = { ok: true; draftId: string } | { ok: false; message: string }

/**
 * "Klonla → taslak": replika taktiği + kariyer kadrosuyla diziliş (`/replicas/{id}/apply`, useReplicaApply ile aynı sorgu anahtarı; önbellek paylaşılır)
 * → yeni taslak (origin replica, aktif). Sınır doluysa labStore mesajı.
 */
export async function cloneReplicaToDraft(client: QueryClient, careerId: number, replica: ReplicaSummary): Promise<CloneResult> {
  const body = { careerId }
  const applied = await client.fetchQuery({
    queryKey: ['replica-apply', replica.id, JSON.stringify(body)],
    queryFn: () => endpoints.replicaApply(replica.id, body),
    staleTime: APPLY_STALE_MS,
  })
  const created = labStore.create(careerId, {
    name: `${replica.club} ${replica.season}`,
    origin: { kind: 'replica', ref: replica.id },
    tactic: tacticFromReplica(replica),
    lineup: lineupFromApply(applied),
  })
  return created.ok ? { ok: true, draftId: created.draft.id } : { ok: false, message: created.message }
}
