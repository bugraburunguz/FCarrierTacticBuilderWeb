import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { RoleFit, SquadFit, UserTactic } from '../../api/types'
import { Field, Select } from '../../components/ui'
import { EmptyState, Panel, Skeleton, StatTile } from '../../design/components/primitives'
import { FIT_STATE_TEXT, fitDisplay } from '../../lib/fitLabels'
import { fromUserTactic, toTacticRequest, type Lineup, type TacticState } from '../../lib/tactic'
import type { CareerLab } from '../../state/labStore'
import { teamFitPct } from '../squad/useSlotFits'

interface Side {
  id: string
  name: string
  tactic: TacticState
  lineup: Lineup
}

const MAIN = 'main'
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')
const trend = (n: number) => (n > 0 ? 'arttı' : n < 0 ? 'düştü' : 'aynı')
const arrow = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '=')

/** Bir tarafın slot uyumları: tek /fit/lineup, dizilenler kilitli (FAZ 4b toplu uyum; 'slot-fit' anahtarı). */
function useSideFits(careerId: number, side: Side | undefined) {
  return useQuery({
    queryKey: ['slot-fit', 'compare', careerId, JSON.stringify(side?.tactic), JSON.stringify(side?.lineup)],
    queryFn: () => endpoints.lineup(careerId, toTacticRequest(side!.tactic), { ...side!.lineup }),
    enabled: side !== undefined && Object.keys(side.lineup).length > 0,
    staleTime: 300_000,
    retry: false,
  })
}

interface SlotFit {
  playerId?: number
  pct?: number
  label?: string
}

function slotFits(data: SquadFit | undefined, lineup: Lineup): Map<string, SlotFit> {
  return new Map((data?.slots ?? []).flatMap((s) => {
    if (lineup[s.slotId] === undefined || s.playerId !== lineup[s.slotId] || !s.roleFit) {
      return []
    }
    const display = fitDisplay(s.roleFit as RoleFit)
    return [[s.slotId, { playerId: s.playerId, pct: display.pct, label: FIT_STATE_TEXT[display.state].label }] as const]
  }))
}

/**
 * Lab › Karşılaştır (KARIYER-UX FAZ 4b, 15 §4.3): iki taslak ya da taslak ↔ ana taktik. Slot slot uyum farkı (B − A) ve etiket değişimi,
 * toplam takım uyumu farkı. Fark hep işaretli ve metinli ("−30 · düştü"); renk tek başına anlam taşımaz. Mobilde tek sütun.
 */
export function CompareTab({ careerId, lab, main }: { careerId: number; lab: CareerLab; main?: UserTactic | null }) {
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId) })
  const nameOf = useMemo(() => new Map((squad.data ?? []).map((c) => [c.player.id, c.player.name])), [squad.data])
  const sides = useMemo<Side[]>(() => [
    ...(main ? [{ id: MAIN, name: `Ana taktik · ${main.name}`, ...fromUserTactic(main) }] : []),
    ...lab.drafts.map((d) => ({ id: d.id, name: `Taslak · ${d.name}${d.dirty ? ' •' : ''}`, tactic: d.tactic, lineup: d.lineup })),
  ], [main, lab.drafts])
  const [aId, setA] = useState<string>()
  const [bId, setB] = useState<string>()
  const a = sides.find((s) => s.id === (aId ?? sides[0]?.id))
  const b = sides.find((s) => s.id === (bId ?? (lab.activeId && lab.activeId !== a?.id ? lab.activeId : sides.find((s) => s.id !== a?.id)?.id)))
  const fitsA = useSideFits(careerId, a)
  const fitsB = useSideFits(careerId, b)

  if (sides.length < 2) {
    return <EmptyState>Karşılaştırmak için en az iki taslak ya da bir taslak ve ana taktik gerekir.</EmptyState>
  }
  const mapA = slotFits(fitsA.data, a?.lineup ?? {})
  const mapB = slotFits(fitsB.data, b?.lineup ?? {})
  const order = [...new Set([...(fitsA.data?.slots ?? []).map((s) => s.slotId), ...(fitsB.data?.slots ?? []).map((s) => s.slotId)])]
  const teamA = teamFitPct([...mapA.values()].flatMap((f) => (f.pct === undefined ? [] : [{ pct: f.pct }])))
  const teamB = teamFitPct([...mapB.values()].flatMap((f) => (f.pct === undefined ? [] : [{ pct: f.pct }])))
  const teamDiff = teamA !== undefined && teamB !== undefined ? teamB - teamA : undefined
  const cell = (f: SlotFit | undefined) => (f?.pct === undefined ? '—' : `${f.playerId !== undefined ? nameOf.get(f.playerId) ?? `#${f.playerId}` : ''} %${f.pct}`)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 min-[768px]:grid-cols-2">
        <Field label="A"><Select value={a?.id} onChange={(e) => setA(e.target.value)}>{sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="B"><Select value={b?.id} onChange={(e) => setB(e.target.value)}>{sides.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      </div>
      <Panel title="Takım uyumu farkı" label="Takım uyumu farkı">
        <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
          <StatTile label="A" value={teamA === undefined ? undefined : `%${teamA}`} />
          <StatTile label="B" value={teamB === undefined ? undefined : `%${teamB}`} />
          <StatTile label="Fark (B − A)" value={teamDiff === undefined ? undefined : signed(teamDiff)} suffix={teamDiff === undefined ? undefined : trend(teamDiff)} />
        </div>
      </Panel>
      <Panel title="Slot slot" label="Slot slot">
        {fitsA.isLoading || fitsB.isLoading ? <Skeleton className="h-48" /> : (
          <ol className="flex flex-col gap-2">
            {order.map((slotId) => {
              const fa = mapA.get(slotId)
              const fb = mapB.get(slotId)
              const diff = fa?.pct !== undefined && fb?.pct !== undefined ? fb.pct - fa.pct : undefined
              const labelText = fa?.label && fb?.label ? (fa.label === fb.label ? fa.label : `${fa.label} → ${fb.label}`) : fa?.label ?? fb?.label ?? ''
              const diffText = diff === undefined ? 'karşılaştırılamaz' : diff === 0 ? 'aynı' : `${signed(diff)} · ${trend(diff)}`
              return (
                <li key={slotId} aria-label={`${slotId}: A ${cell(fa)}, B ${cell(fb)}, fark ${diffText}. ${labelText}`}
                  className="glass-3 grid grid-cols-1 gap-1 rounded-[var(--radius-sm)] p-2.5 text-sm min-[768px]:grid-cols-[72px_1fr_1fr_140px] min-[768px]:items-center">
                  <b className="font-[var(--font-num)]">{slotId}</b>
                  <span><span className="text-xs text-muted min-[768px]:hidden">A · </span>{cell(fa)}</span>
                  <span><span className="text-xs text-muted min-[768px]:hidden">B · </span>{cell(fb)}</span>
                  <span className="font-[var(--font-num)] tabular-nums"><span aria-hidden="true">{diff === undefined ? '' : `${arrow(diff)} `}</span>{diffText}</span>
                  {labelText && <span className="text-xs text-ink-2 min-[768px]:col-span-4">{labelText}</span>}
                </li>
              )
            })}
          </ol>
        )}
      </Panel>
    </div>
  )
}
