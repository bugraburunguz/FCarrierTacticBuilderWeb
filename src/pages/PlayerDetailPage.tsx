import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useActiveCareerId } from '../state/careerStore'
import { FitResultCard } from '../components/FitResultCard'
import { PositionOverallPitch } from '../components/PositionOverallPitch'
import { RolePicker, type RoleSelection } from '../components/RolePicker'
import { AttributeRadar } from '../components/AttributeRadar'
import { CompareButton } from '../components/CompareButton'
import { DevelopmentPlan } from '../components/DevelopmentPlan'
import { PlayerRoles } from '../components/PlayerRoles'
import { SimilarPlayers } from '../components/SimilarPlayers'
import { AttrBar, Button, Card, ErrorBox, Pill, Spinner } from '../components/ui'
import { ATTR_GROUPS, ATTR_LABELS } from '../lib/format'

export function PlayerDetailPage() {
  const id = Number(useParams().id)
  const { authenticated } = useAuth()
  const activeCareer = useActiveCareerId()
  const careerId = authenticated ? activeCareer : undefined
  const detail = useQuery({ queryKey: ['player', id, careerId], queryFn: () => endpoints.player(id, careerId), enabled: Number.isFinite(id) })
  const [selection, setSelection] = useState<RoleSelection>({ position: 'RW', roleId: 'winger_attack', tags: [] })
  const fit = useMutation({
    mutationFn: () => endpoints.fitRole({ playerId: id, roleId: selection.roleId, position: selection.position, tags: selection.tags }),
  })

  if (detail.isLoading) {
    return <Spinner />
  }
  if (detail.error || !detail.data) {
    return <ErrorBox error={detail.error ?? new Error('not found')} />
  }
  const { summary, attrs, playstyles } = detail.data
  const isGoalkeeper = summary.positions.includes('GK')

  return (
    <div className="space-y-4">
      <Link to="/players" className="text-sm text-emerald-700 hover:underline">
        ← Oyunculara dön
      </Link>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{summary.name}</h1>
            <div className="mt-1"><CompareButton entry={{ id: summary.id, name: summary.name, overall: summary.overall, position: summary.positions[0] ?? "" }} /></div>
            <p className="text-sm text-slate-500">
              {[summary.club, summary.league, summary.nationality].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.positions.map((p) => (
                <Pill key={p} tone="sky">
                  {p}
                </Pill>
              ))}
              {summary.accelerate && <Pill>{summary.accelerate}</Pill>}
              {!!summary.runStyle && <Pill>Özel koşu #{summary.runStyle}</Pill>}
              {detail.data.preferredFoot && <Pill>{detail.data.preferredFoot === 'Left' ? 'Sol ayak' : 'Sağ ayak'}</Pill>}
              {careerId !== undefined && <Pill tone="emerald">Kariyer verisi</Pill>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-6 text-center">
            <div>
              <dt className="text-xs text-slate-500">Genel</dt>
              <dd className="text-3xl font-bold">{summary.overall}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Potential*</dt>
              <dd className="text-3xl font-bold">{summary.potential ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-2 text-xs text-slate-500">* Model tahmini — EA’nın gerçek potential verisi değildir.</p>
        <p className="mt-1 text-xs text-slate-500">
          {summary.age ? `${summary.age} yaş` : ''} {detail.data.heightCm ? `· ${detail.data.heightCm} cm` : ''} {detail.data.weightKg ? `· ${detail.data.weightKg} kg` : ''}
          {detail.data.weakFoot ? ` · Zayıf ayak ${detail.data.weakFoot}★` : ''} {detail.data.skillMoves ? ` · Hareket ${detail.data.skillMoves}★` : ''}
        </p>
      </Card>

      <PlayerRoles playerId={summary.id} listed={summary.positions} />
      <DevelopmentPlan playerId={summary.id} overall={summary.overall} potential={summary.potential} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Attribute'lar">
          <div className="space-y-4">
            <AttributeRadar series={[{ name: summary.name, attrs }]} goalkeeper={isGoalkeeper} />
            {ATTR_GROUPS.filter((g) => (g.title === 'Kaleci') === isGoalkeeper || g.title !== 'Kaleci').map((group) => (
              <div key={group.title}>
                <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">{group.title}</h3>
                <div className="space-y-1">
                  {group.attrs.map((a) => (
                    <AttrBar key={a} label={ATTR_LABELS[a] ?? a} value={attrs[a] ?? 0} />
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(playstyles).length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">PlayStyle</h3>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(playstyles).map(([ps, level]) => (
                    <Pill key={ps} tone={level >= 2 ? 'amber' : 'slate'}>
                      {ps}
                      {level >= 2 ? '+' : ''}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Bu oyuncu hangi rolde nasıl oynar?">
          <div className="space-y-3">
            {detail.data.positionOveralls && Object.keys(detail.data.positionOveralls).length > 1 && (
              <PositionOverallPitch overalls={detail.data.positionOveralls} listed={summary.positions} />
            )}
            <RolePicker value={selection} onChange={setSelection} />
            <Button onClick={() => fit.mutate()} disabled={!selection.roleId || fit.isPending}>
              {fit.isPending ? 'Hesaplanıyor…' : 'Uyumu hesapla'}
            </Button>
            <ErrorBox error={fit.error} />
            {fit.data && <FitResultCard result={fit.data} />}
          </div>
        </Card>
      </div>
      <SimilarPlayers playerId={summary.id} potential={summary.potential} />
    </div>
  )
}
