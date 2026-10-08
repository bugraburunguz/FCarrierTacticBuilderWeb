import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Acquisition, Feasibility, ScoutingCandidate, ScoutingQuery } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { CompareButton } from '../components/CompareButton'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Select, Spinner } from '../components/ui'
import { formatEur } from '../lib/format'
import { POSITION_ORDER } from '../lib/positions'
import { useActiveCareerId } from '../state/careerStore'
import { useTactic } from '../state/tacticStore'

const FEASIBILITY: Record<Feasibility, { label: string; tone: 'emerald' | 'amber' | 'rose' }> = {
  REALISTIC: { label: 'Gerçekçi', tone: 'emerald' },
  AMBITIOUS: { label: 'İddialı', tone: 'amber' },
  UNREALISTIC: { label: 'Hayal', tone: 'rose' },
}

const ACQUISITION: Record<Acquisition, string> = { FREE: 'Bedava', LOAN: 'Kiralık', BUY: 'Satın al' }

const SORTS: { value: NonNullable<ScoutingQuery['sort']>; label: string }[] = [
  { value: 'fit', label: 'En uygun oyun tarzı' },
  { value: 'opportunity', label: 'En iyi fırsat (uyum / bedel)' },
  { value: 'potential', label: 'En yüksek potansiyel' },
]

function Row({ candidate }: { candidate: ScoutingCandidate }) {
  const { player, roleFit, feasibility } = candidate
  return (
    <li className={`rounded-xl border border-slate-200 p-3 dark:border-slate-700 ${feasibility === 'UNREALISTIC' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/players/${player.id}`} className="font-semibold hover:underline">
            {player.name}
          </Link>{' '}
          <span className="text-xs text-slate-500">
            {player.positions.slice(0, 3).join('/')} · {player.overall} OVR{player.age ? ` · ${player.age} yaş` : ''}
            {player.club ? ` · ${player.club}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <BadgeDot state={roleFit.badge} />
          <span className="text-sm font-semibold tabular-nums">%{Math.round(roleFit.score)}</span>
          <Pill tone={FEASIBILITY[feasibility].tone}>{FEASIBILITY[feasibility].label}</Pill>
          <Pill tone="sky">{ACQUISITION[candidate.acquisition]}</Pill>
          {candidate.potential && <Pill tone="amber">POTANSİYEL</Pill>}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {candidate.acquisition === 'FREE' ? 'Bonservis bedeli yok' : candidate.estimatedFee !== undefined ? `Tahmini bedel ${formatEur(candidate.estimatedFee)}` : 'Bedel bilinmiyor'}
          {candidate.estimatedFee !== undefined && candidate.acquisition !== 'FREE' ? (candidate.valueSource === 'MODELED' ? ' (modellenmiş)' : ' (içe aktarılan)') : ''}
          {player.potential ? ` · POT ${player.potential}` : ''}
          {' · '}fırsat {candidate.opportunity.toFixed(1)}
        </span>
        <CompareButton entry={{ id: player.id, name: player.name, overall: player.overall, position: player.positions[0] ?? '' }} />
      </div>
      {roleFit.reasons.length > 0 && (
        <details className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer">Neden bu skor?</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {roleFit.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  )
}

export function ScoutingPage() {
  const careerId = useActiveCareerId()
  const tactic = useTactic()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const [position, setPosition] = useState('CAM')
  const [ageMax, setAgeMax] = useState('')
  const [potentialMin, setPotentialMin] = useState('')
  const [dream, setDream] = useState(false)
  const [sort, setSort] = useState<NonNullable<ScoutingQuery['sort']>>('fit')

  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const slot = formation?.slots.find((s) => s.position === position)
  const roleId = (slot && tactic.slots[slot.slotId]?.roleId) ?? slot?.defaultRole ?? (roles.data ?? []).find((r) => r.positions.includes(position))?.id
  const tags = (slot && tactic.slots[slot.slotId]?.tags) ?? []
  const positions = [...new Set((formation?.slots ?? []).map((s) => s.position))].sort((a, b) => POSITION_ORDER.indexOf(a) - POSITION_ORDER.indexOf(b))

  const search = useMutation({
    mutationFn: () =>
      endpoints.scoutingSearch(careerId!, {
        position,
        roleId: roleId!,
        tags,
        setup: tactic.setup,
        ageMax: ageMax ? Number(ageMax) : undefined,
        potentialMin: potentialMin ? Number(potentialMin) : undefined,
        dream,
        sort,
      }),
  })

  if (formations.isLoading || roles.isLoading) {
    return <Spinner />
  }
  const roleName = (roles.data ?? []).find((r) => r.id === roleId)?.name
  const result = search.data

  return (
    <div className="space-y-4">
      <Card title="Scouting & transfer">
        <div className="space-y-3">
          <CareerSelect />
          {careerId === undefined && <p className="text-sm text-slate-500">Önce bir kariyer seç. Aday havuzu kulübünün ligine, bütçene ve kadro seviyene göre süzülür.</p>}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Mevki">
              <Select value={position} onChange={(e) => setPosition(e.target.value)}>
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="En fazla yaş">
              <Input type="number" min={15} max={45} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="Hepsi" />
            </Field>
            <Field label="Min potansiyel">
              <Input type="number" min={1} max={99} value={potentialMin} onChange={(e) => setPotentialMin(e.target.value)} placeholder="Hepsi" />
            </Field>
            <Field label="Sıralama">
              <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dream} onChange={(e) => setDream(e.target.checked)} />
              Hayal modu (gerçekçi olmayan adayları da göster)
            </label>
            <Button disabled={careerId === undefined || !roleId || search.isPending} onClick={() => search.mutate()}>
              {search.isPending ? 'Aranıyor…' : 'Aday bul'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Rol: {roleName ?? '—'} (Taktik sayfasındaki {tactic.formation} seçimine göre). Uyum yüzdesi gerçek RoleFit motorundan gelir.
          </p>
        </div>
      </Card>
      <ErrorBox error={search.error} />
      {result && (
        <Card title={`Adaylar · ${result.items.length}`} actions={result.budgetEur !== undefined ? <Pill tone="sky">Bütçe {formatEur(result.budgetEur)}</Pill> : undefined}>
          {result.items.length === 0 ? (
            <EmptyState>Bütçe ve lig filtresiyle uygun aday yok. Hayal modunu aç ya da yaş/potansiyel kısıtını gevşet.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {result.items.map((c) => (
                <Row key={c.player.id} candidate={c} />
              ))}
            </ul>
          )}
          {!dream && result.hiddenUnrealistic > 0 && <p className="mt-2 text-xs text-slate-500">{result.hiddenUnrealistic} gerçekçi olmayan aday gizlendi.</p>}
          <p className="mt-2 text-xs text-slate-500">
            Gerçekçilik; lig seviyesi, değer/bütçe oranı ve oyuncunun kadro ortalamasına farkından bileşik bir skorla hesaplanır (ilk kalibrasyon). Ücret verisi olmadığı için ücret bayrağı yok.
          </p>
        </Card>
      )}
    </div>
  )
}
