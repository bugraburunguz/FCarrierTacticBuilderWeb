import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { TacticCodeImport, TacticRequest } from '../../api/types'
import { useEaRoles } from '../../lib/eaRoles'
import { faceAverages } from '../../lib/faceAverages'
import { swapSlots } from '../../lib/squadBuilder'
import type { SlotPanel, SquadBinding, SquadMode } from './types'

const STALE_NOTE = 'Kayıtlı formasyon/rol bilgisi güncel formasyonla uyuşmadığı için sıfırlandı.'
const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const

export interface Selection {
  slotId: string
  panel: SlotPanel
}

/**
 * UT ve kariyer kadro sayfalarının ortak çekirdeği (F11): formasyon seçimi, rol/etiket durumu, eski kayıt temizliği,
 * TEK taktik çözme sorgusu, slot seçimi, atama/yer değiştirme, yüz ortalamaları. Modlar yalnız `binding` ile ayrışır.
 */
export function useSquadWorkspace<T>(mode: SquadMode, binding: SquadBinding<T>) {
  const { state, patch } = binding
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: 600_000 })
  const eaRoles = useEaRoles()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [note, setNote] = useState<string>()

  const formation = formations.data?.find((f) => f.id === state.formationId) ?? formations.data?.[0]
  const slots = useMemo(() => formation?.slots ?? [], [formation])
  // Kayıtlı formasyon/rol/slot kayıtları güncel formasyonla uyuşmuyorsa (temizlenene kadar) çözme isteği gitmez (V3-00).
  const slotIds = new Set(slots.map((s) => s.slotId))
  const knownFormation = formations.data?.some((f) => f.id === state.formationId) ?? false
  const foreign = (ids: string[]) => ids.some((id) => !slotIds.has(id))
  const stale = Boolean(formations.data?.length) && (!knownFormation || foreign(Object.keys(state.roleOverride)) || foreign(Object.keys(state.tags)) || foreign(Object.keys(state.assigned)))

  const tactic: TacticRequest = useMemo(
    () => ({
      formation: formation?.id,
      presetId: state.presetId,
      slots: [...new Set([...Object.keys(state.roleOverride), ...Object.keys(state.tags)])].map((slotId) => ({ slotId, tags: state.tags[slotId] ?? [], roleId: state.roleOverride[slotId] })),
      setup: state.setup,
    }),
    [formation?.id, state.presetId, state.roleOverride, state.tags, state.setup],
  )
  // Bu çekirdekte tek çözme sorgusu: alt bileşenler (taktik kodu, rol etiketi) sonucu prop olarak alır.
  const resolved = useQuery({
    queryKey: ['resolve', mode, JSON.stringify(tactic)],
    queryFn: () => endpoints.resolveTactic(tactic),
    enabled: Boolean(formation) && !stale,
    retry: false,
  })
  const roleBySlot = useMemo(() => new Map((resolved.data?.slots ?? []).map((s) => [s.slotId, s])), [resolved.data])

  useEffect(() => {
    if (!stale || !formations.data?.length) {
      return
    }
    const known = formations.data.find((f) => f.id === state.formationId)
    const target = known ?? formations.data.find((f) => f.id === binding.defaultFormation) ?? formations.data[0]
    const valid = new Set(target.slots.map((s) => s.slotId))
    const only = <V,>(record: Record<string, V>) => (known ? Object.fromEntries(Object.entries(record).filter(([id]) => valid.has(id))) : {})
    patch((cur) => ({
      formationId: target.id,
      presetId: known ? cur.presetId : undefined,
      roleOverride: only(cur.roleOverride),
      tags: only(cur.tags),
      assigned: Object.fromEntries(Object.entries(cur.assigned).filter(([id]) => valid.has(id))),
    }))
    setNote(STALE_NOTE)
    setSelection(null)
  }, [stale, formations.data, state.formationId, binding.defaultFormation, patch])

  const averages = useMemo(
    () => faceAverages(Object.values(state.assigned).flatMap((item) => binding.faceOf(item) ?? [])),
    [state.assigned, binding],
  )

  /** `keepTactic`: yeni formasyon seçili taktiğe (preset) aitse rol/etiket/preset korunur (kariyer). */
  function changeFormation(id: string, keepTactic = false) {
    const next = formations.data?.find((f) => f.id === id)
    if (!next) {
      return
    }
    patch((cur) => ({
      formationId: id,
      assigned: binding.carry(slots, cur.assigned, next.slots),
      ...(keepTactic ? {} : { roleOverride: {}, tags: {}, presetId: undefined }),
    }))
    setSelection(null)
  }

  function setRole(slotId: string, roleId: string | undefined) {
    patch((cur) => {
      const { [slotId]: _old, ...rest } = cur.roleOverride
      return { roleOverride: roleId === undefined ? rest : { ...rest, [slotId]: roleId } }
    })
  }

  function setTags(slotId: string, next: string[]) {
    patch((cur) => ({ tags: { ...cur.tags, [slotId]: next } }))
  }

  /** `item` null ise slot boşaltılır; aynı kişi başka slottaysa oradan alınır. */
  function assign(slotId: string, item: T | null) {
    patch((cur) => {
      const rest = Object.fromEntries(Object.entries(cur.assigned).filter(([id, other]) => id !== slotId && (item === null || binding.keyOf(other) !== binding.keyOf(item))))
      return { assigned: item === null ? rest : { ...rest, [slotId]: item } }
    })
  }

  function swap(from: string, to: string) {
    patch((cur) => ({ assigned: swapSlots(cur.assigned, from, to) }))
  }

  function clearAssigned() {
    patch({ assigned: {} })
  }

  /** EA taktik kodu yüklendi: formasyon, roller, Build-Up ve hat gelir; atamalar moda göre kalır ya da temizlenir. */
  function applyImportedCode(r: Pick<TacticCodeImport, 'formation' | 'buildUp' | 'depth' | 'slots'>) {
    patch({
      formationId: r.formation,
      presetId: undefined,
      roleOverride: Object.fromEntries(r.slots.map((s) => [s.slotId, s.roleId])),
      tags: {},
      setup: { buildUp: (BUILD_UPS as readonly string[]).includes(r.buildUp) ? (r.buildUp as (typeof BUILD_UPS)[number]) : 'Balanced', depth: r.depth },
      ...(binding.keepAssignedOnImport ? {} : { assigned: {} }),
    })
    setSelection(null)
  }

  return {
    mode,
    binding,
    state,
    patch,
    formations,
    roles,
    eaRoles,
    formation,
    slots,
    stale,
    tactic,
    resolved,
    roleBySlot,
    selection,
    selectedSlot: slots.find((s) => s.slotId === selection?.slotId),
    select: (slotId: string, panel: SlotPanel) => setSelection({ slotId, panel }),
    clearSelection: () => setSelection(null),
    note,
    setNote,
    averages,
    changeFormation,
    setRole,
    setTags,
    assign,
    swap,
    clearAssigned,
    applyImportedCode,
  }
}

export type SquadWorkspaceApi<T> = ReturnType<typeof useSquadWorkspace<T>>
