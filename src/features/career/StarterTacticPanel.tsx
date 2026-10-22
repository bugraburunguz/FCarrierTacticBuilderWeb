import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import { Button, Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../design/components/primitives'
import { labStore, useLab } from '../../state/labStore'
import { useActiveTactic } from './activeTactic'
import { MakeMainDialog } from './MakeMainDialog'

const MIGRATED_REF = 'fc.tactic'

/**
 * Ana taktik paneli (KARIYER-UX D-30/D-31): ana taktik varsa "Kararın", yoksa ücretsiz otomatik başlangıç önerisi ("Otomatik öneri · ana taktik değil").
 * Saha salt okunur Cyber-Pitch, piyon modu. Masa, Kadro ve Transfer (FAZ 2-5) bunu kullanır; düzenleme yalnız Lab'da.
 */
export function StarterTacticPanel({ careerId, onOpenLab, onDetailed, detailedCost }: {
  careerId: number
  /** Lab'da düzenle: yeni taslağın kimliği (Lab sayfası FAZ 4). */
  onOpenLab?: (draftId: string) => void
  /** Detaylı (ücretli) taktik önerisi: mevcut /advisor/tactic. */
  onDetailed?: () => void
  detailedCost?: number
}) {
  const { active, isLoading, error } = useActiveTactic(careerId)
  const formations = useQuery({ queryKey: ['formations'], queryFn: () => endpoints.formations() })
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId) })
  const lab = useLab(careerId)
  const migrated = lab.drafts.find((d) => d.origin.ref === MIGRATED_REF && d.dirty)
  const [dialog, setDialog] = useState<'active' | 'migrated'>()
  const [labMessage, setLabMessage] = useState<string>()

  const slots: PitchSlot[] = useMemo(() => {
    const formation = formations.data?.find((f) => f.id === active?.tactic.formation)
    if (!formation || !active) {
      return []
    }
    const players = new Map((squad.data ?? []).map((c) => [c.player.id, c.player]))
    const roleNames = new Map((active.starter?.slots ?? []).map((s) => [s.slotId, s.roleName]))
    return formation.slots.map((s) => {
      const player = players.get(active.lineup[s.slotId])
      return {
        slotId: s.slotId, position: s.position, x: s.x, y: s.y,
        player: player && { name: player.name, rating: player.overall, position: s.position },
        roleLabel: roleNames.get(s.slotId) ?? active.tactic.slots[s.slotId]?.roleId ?? s.defaultRole,
      }
    })
  }, [formations.data, squad.data, active])

  if (isLoading || formations.isLoading) {
    return <Panel title="Ana taktik"><Skeleton className="h-64 w-full" /></Panel>
  }
  if (error) {
    return <Panel title="Ana taktik"><ErrorState message="Taktik yüklenemedi." /></Panel>
  }
  if (!active) {
    return <Panel title="Ana taktik"><EmptyState>Öneri için kadroda en az 11 oyuncu olmalı.</EmptyState></Panel>
  }

  const auto = active.source.kind === 'auto'
  function openLab() {
    const created = labStore.create(careerId, {
      name: auto ? 'Otomatik öneri' : (active!.main?.name ?? 'Ana taktik'),
      origin: auto ? { kind: 'auto' } : { kind: 'main', ref: String(active!.main?.slot) },
      tactic: active!.tactic,
      lineup: active!.lineup,
    })
    if (!created.ok) {
      setLabMessage(created.message)
      return
    }
    onOpenLab?.(created.draft.id)
  }

  return (
    <Panel
      title={active.tactic.formation}
      source={active.source}
      actions={(
        <span className="flex flex-wrap gap-2">
          {auto && <Button variant="primary" onClick={() => setDialog('active')}>Ana taktiğim yap</Button>}
          <Button onClick={openLab}>Lab'da düzenle</Button>
          {auto && onDetailed && <Button variant="ghost" onClick={onDetailed}>{`Detaylı öneri${detailedCost ? ` (${detailedCost} kredi)` : ''}`}</Button>}
        </span>
      )}
    >
      {auto && active.starter && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span>Kadro uyumu <span className="font-mono text-ink">%{Math.round(active.starter.squadFit)}</span></span>
          {active.starter.alternatives.map((a) => <Chip key={a.formationId} title={`Uyum skoru ${a.score.toFixed(1)}`}>{a.formationId}</Chip>)}
        </p>
      )}
      {active.dropped > 0 && <p role="status" className="mb-3 text-sm text-warn">{active.dropped} oyuncu kadroda yok, otomatik dolduruldu</p>}
      {labMessage && <p role="alert" className="mb-3 text-sm text-bad">{labMessage}</p>}
      {migrated && auto && (
        <p className="mb-3">
          <Button variant="secondary" onClick={() => setDialog('migrated')}>Önceki taslağı ana taktik yap</Button>
        </p>
      )}
      <Pitch slots={slots} onPickPlayer={() => undefined} readOnly field="cyber" marker="pawn" />
      {dialog === 'active' && (
        <MakeMainDialog careerId={careerId} name={auto ? 'Otomatik öneri' : (active.main?.name ?? 'Ana taktik')} tactic={active.tactic} lineup={active.lineup} onClose={() => setDialog(undefined)} />
      )}
      {dialog === 'migrated' && migrated && (
        <MakeMainDialog careerId={careerId} name={migrated.name} tactic={migrated.tactic} lineup={migrated.lineup}
          onDone={(slot) => labStore.markSaved(careerId, migrated.id, slot)} onClose={() => setDialog(undefined)} />
      )}
    </Panel>
  )
}
