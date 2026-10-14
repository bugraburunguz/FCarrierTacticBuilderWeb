import type { BehaviorTag, CareerPlayer, FormationSlot, Preset, Role } from '../../api/types'
import { BehaviorsPanel } from '../../components/squadBuilder/BehaviorsPanel'
import { RoleFocusPanel } from '../../components/squadBuilder/RoleFocusModal'
import type { SlotTab } from '../../components/squadBuilder/SlotModal'
import { roleGroups } from '../../lib/squadBuilder'
import { RecommendationPanel } from '../recommend/RecommendationPanel'
import { CareerPickList } from './pick/CareerPickList'
import type { SquadWorkspaceApi } from './useSquadWorkspace'

interface Args {
  ws: SquadWorkspaceApi<number>
  slot: FormationSlot
  hasCareer: boolean
  careerId?: number
  candidates: CareerPlayer[]
  roleId: string
  slotTags: string[]
  dialogTags: BehaviorTag[]
  dialogRoles: Role[]
  preset?: Preset
}

/**
 * Kariyere özgü slot sekmeleri (Oyuncu · Rol & odak · Davranışlar · Öneriler): klasik modalda sekme, v3'te yan panel gövdesi.
 * Davranışlar ve Öneriler kariyer motoruna bağlıdır; UT'de karşılığı yoktur (UT'de rol seçimi çekirdekteki rol penceresinden gelir).
 */
export function careerSlotTabs({ ws, slot, hasCareer, careerId, candidates, roleId, slotTags, dialogTags, dialogRoles, preset }: Args): SlotTab[] {
  return [
    {
      id: 'card',
      label: 'Oyuncu',
      node: hasCareer ? (
        <CareerPickList
          position={slot.position}
          roleId={roleId}
          tags={slotTags}
          candidates={candidates}
          currentPlayerId={ws.state.assigned[slot.slotId]}
          onPick={(pid) => {
            ws.assign(slot.slotId, pid)
            ws.clearSelection()
          }}
          onClear={() => {
            ws.assign(slot.slotId, null)
            ws.clearSelection()
          }}
        />
      ) : (
        <p className="text-sm text-ink/80">Oyuncu atamak için giriş yapıp bir kariyer seç. Öneriler sekmesi kariyersiz de çalışır.</p>
      ),
    },
    {
      id: 'role',
      label: 'Rol & odak',
      node: (
        <RoleFocusPanel
          position={slot.position}
          groups={roleGroups(ws.roles.data ?? [], slot.position, ws.eaRoles.allowed)}
          lock={ws.eaRoles.status === 'ready' ? undefined : { status: ws.eaRoles.status, retry: ws.eaRoles.retry }}
          currentRoleId={roleId}
          onApply={(rid) => {
            ws.setRole(slot.slotId, rid)
            ws.clearSelection()
          }}
          onClose={ws.clearSelection}
        />
      ),
    },
    {
      id: 'behaviors',
      label: 'Davranışlar',
      node: (
        <BehaviorsPanel
          derivedRoleName={ws.roleBySlot.get(slot.slotId)?.roleName}
          roleHint={preset?.roleHints?.[slot.slotId]}
          tags={dialogTags}
          selected={slotTags}
          onTags={(next) => ws.setTags(slot.slotId, next)}
          roleOverride={ws.state.roleOverride[slot.slotId]}
          roles={dialogRoles}
          onRole={(rid) => ws.setRole(slot.slotId, rid)}
        />
      ),
    },
    {
      id: 'suggest',
      label: 'Öneriler',
      node: <RecommendationPanel key={slot.slotId} careerId={careerId} position={slot.position} slotId={slot.slotId} roleId={ws.roleBySlot.get(slot.slotId)?.roleId ?? roleId} />,
    },
  ]
}
