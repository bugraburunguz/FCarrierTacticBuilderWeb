import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { ReplicaApplyResult, ReplicaSummary } from '../../api/types'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import { Button, Chip, ErrorState, Skeleton, TabPanel, Tabs } from '../../design/components/primitives'
import { Workspace } from '../../design/components/Workspace'
import { cardPlayerOfSummary } from '../../lib/cardPlayer'
import { ApplyTab } from './ApplyTab'
import { AttentionPoints } from './AttentionPoints'
import { CATEGORY_LABEL } from './labels'
import { StoryTab, TacticTab } from './ReplicaTabs'
import { slotFit } from './slotFit'
import { useReplicaApply } from './useReplicaApply'

type TabId = 'taktik' | 'hikaye' | 'dikkat' | 'uygula'
const TABS: { id: TabId; label: string }[] = [
  { id: 'taktik', label: 'Taktik' },
  { id: 'hikaye', label: 'Hikâye' },
  { id: 'dikkat', label: 'Dikkat noktaları' },
  { id: 'uygula', label: 'Kadromla uygula' },
]
const STALE_MS = 600_000
const PREFIX = 'replika'

function pitchSlots(summary: ReplicaSummary, formation: { slots: { slotId: string; position: string; x: number; y: number }[] }, applied?: ReplicaApplyResult): PitchSlot[] {
  const roleBySlot = new Map(summary.slots.map((s) => [s.slotId, s]))
  const appliedBySlot = new Map((applied?.slots ?? []).map((s) => [s.slotId, s]))
  return formation.slots.map((s) => {
    const role = roleBySlot.get(s.slotId)
    const slot = appliedBySlot.get(s.slotId)
    const fit = slot?.player ? slotFit(slot) : undefined
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      roleLabel: role ? `${role.role} · ${role.focus}` : undefined,
      player: slot?.player ? cardPlayerOfSummary(slot.player, s.position) : undefined,
      fit: fit ? { pct: fit.pct, state: fit.state } : undefined,
      outOfPosition: slot?.outOfPosition,
    }
  })
}

/** Replika detay (Detay şablonu): solda salt okunur saha + roller, sağda sekmeler (Taktik · Hikâye · Dikkat noktaları · Kadromla uygula). */
export function ReplicaDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('sekme'))?.id ?? 'taktik') as TabId
  const list = useQuery({ queryKey: ['replicas'], queryFn: endpoints.replicas, staleTime: STALE_MS })
  const summary = list.data?.find((r) => r.id === id)
  const detail = useQuery({ queryKey: ['replica', id], queryFn: () => endpoints.replica(id), staleTime: STALE_MS, enabled: id !== '' })
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: STALE_MS })
  const legacy = useQuery({ queryKey: ['replica-legacy-ids'], queryFn: endpoints.replicaLegacyIds, staleTime: STALE_MS, enabled: detail.isError })
  const apply = useReplicaApply(id, tab === 'uygula')
  const formation = formations.data?.find((f) => f.id === summary?.formationId)
  const slots = useMemo(() => (summary && formation ? pitchSlots(summary, formation, tab === 'uygula' ? apply.result.data : undefined) : []), [summary, formation, tab, apply.result.data])

  // Eski preset kimlikleriyle gelen bağlantılar yeni replikaya taşınır (eşleşme tablosu sunucuda).
  const moved = legacy.data?.[id]
  if (detail.isError && moved) {
    return <Navigate to={`/replicas/${moved}`} replace />
  }
  const back = (
    <Link to="/replicas" className="inline-flex min-h-8 items-center gap-1 text-sm font-semibold text-accent max-sm:min-h-11">
      <ChevronLeft size={16} aria-hidden="true" />
      Replikalar
    </Link>
  )
  if (detail.isError || (list.isSuccess && !summary)) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-4">
        {back}
        <ErrorState message="Bu replika bulunamadı." onRetry={() => detail.refetch()} />
      </div>
    )
  }
  const loading = !summary || !detail.data || !formation
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-4">
      <Workspace
        title={summary ? `${summary.club} ${summary.season}` : 'Replika'}
        header={
          <div className="flex flex-col gap-1">
            {back}
            {summary ? (
              <>
                <h2 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">
                  {summary.club} <span className="font-[var(--font-num)] text-xl font-medium text-ink-2">{summary.season}</span>
                </h2>
                <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                  {summary.coach}
                  <Chip>{CATEGORY_LABEL[summary.category]}</Chip>
                </p>
              </>
            ) : (
              <Skeleton className="h-9 w-72" />
            )}
          </div>
        }
        hero={loading ? <Skeleton className="h-[480px]" /> : <Pitch slots={slots} onPickPlayer={() => undefined} readOnly />}
        side={
          <aside aria-label="Replika bilgisi" className="glass-2 flex flex-col gap-3 p-4 text-ink min-[820px]:sticky min-[820px]:top-[var(--header-h)] min-[820px]:w-[420px] min-[820px]:shrink-0 min-[820px]:self-start">
            <Tabs label="Replika sekmeleri" idPrefix={PREFIX} value={tab} tabs={TABS} onChange={(next) => setParams({ sekme: next }, { replace: true })} />
            {loading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <TabPanel idPrefix={PREFIX} id="taktik" active={tab === 'taktik'}>
                  <TacticTab summary={summary} detail={detail.data} />
                </TabPanel>
                <TabPanel idPrefix={PREFIX} id="hikaye" active={tab === 'hikaye'}>
                  <StoryTab detail={detail.data} />
                </TabPanel>
                <TabPanel idPrefix={PREFIX} id="dikkat" active={tab === 'dikkat'}>
                  <AttentionPoints analysis={detail.data.analysis} />
                  <div className="mt-3">
                    <Button onClick={() => setParams({ sekme: 'uygula' }, { replace: true })}>Kadromla uygula</Button>
                  </div>
                </TabPanel>
                <TabPanel idPrefix={PREFIX} id="uygula" active={tab === 'uygula'}>
                  <ApplyTab replicaId={id} apply={apply} />
                </TabPanel>
              </>
            )}
          </aside>
        }
      />
    </div>
  )
}
