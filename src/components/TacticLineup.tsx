import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { CareerPlayer, Formation } from '../api/types'
import { mirrorTactic } from '../lib/mirror'
import { pickBench } from '../lib/bench'
import { tacticStore, toTacticRequest, useTactic } from '../state/tacticStore'
import { Pitch } from './squadBuilder/Pitch'
import type { SlotView } from './squadBuilder/PositionCard'
import { useNavigate } from 'react-router-dom'
import { BadgeDot, Button, Card, ErrorBox, Pill, Spinner } from './ui'

interface Props {
  careerId: number
  squad: CareerPlayer[]
  formations: Formation[]
}

const shortRole = (name: string) => name.replace(/\s*\(.*\)/, '')

export function TacticLineup({ careerId, squad, formations }: Props) {
  const tactic = useTactic()
  const navigate = useNavigate()
  const request = toTacticRequest(tactic)
  const formation = formations.find((f) => f.id === tactic.formation)
  const lineup = useQuery({
    queryKey: ['lineup', careerId, squad.length, JSON.stringify(request)],
    queryFn: () => endpoints.lineup(careerId, request),
    enabled: squad.length >= 11 && formation !== undefined,
    retry: false,
  })

  if (squad.length < 11) {
    return (
      <Card title="Seçili taktikte kadro">
        <p className="text-sm text-slate-500">İlk 11’i dizebilmek için kadroda en az 11 oyuncu olmalı.</p>
      </Card>
    )
  }
  const fit = lineup.data
  const bench = fit ? pickBench(squad, fit) : []
  const views: SlotView[] = (formation?.slots ?? []).map((sl) => {
    const result = fit?.slots.find((s) => s.slotId === sl.slotId)
    return {
      slotId: sl.slotId,
      position: sl.position,
      x: sl.x,
      y: sl.y,
      player: result?.playerName ? { id: result.playerId ?? 0, name: result.playerName, overall: result.overall ?? 0 } : undefined,
      roleLabel: result ? shortRole(result.roleName) + (result.roleName.match(/((.*))/) ? ` · ${result.roleName.match(/((.*))/)![1]}` : '') : '…',
      fit: result?.roleFit ? { pct: Math.round(result.roleFit.score), band: result.roleFit.badge } : undefined,
    }
  })

  return (
    <Card
      title={`Seçili taktikte kadro · ${tactic.formation}${tactic.presetId ? ` · ${tactic.presetId}` : ''}`}
      actions={
        <div className="flex gap-3 text-sm">
          <Link to="/squad/builder" className="text-emerald-700 underline">
            Kadro kurucuda düzenle
          </Link>
          <Link to="/tactics/builder" className="text-emerald-700 underline">
            Taktiği düzenle
          </Link>
        </div>
      }
    >
      {lineup.isLoading && <Spinner />}
      <ErrorBox error={lineup.error} />
      {fit && formation && (
        <div className="space-y-3">
          {fit.mirrored && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <span>
                <Pill tone="amber">Aynalandı</Pill> Kadronda bu görevlere sağ-sol ters daha uygun oyuncular var; taktik otomatik aynalandı (ör. sağ kanat görevi sola geçti).
              </span>
              <Button variant="secondary" onClick={() => tacticStore.set(mirrorTactic(tactic))}>
                Aynalanmış taktiği kaydet
              </Button>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(300px,440px)_1fr]">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-2.5">
              <Pitch slots={views} onPickPlayer={() => navigate('/squad/builder')} onPickRole={() => navigate('/squad/builder')} />
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">İlk 11 ve yedekleri</h4>
                <ul className="space-y-1 text-sm">
                  {fit.slots.map((s) => (
                    <li key={s.slotId} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong className="inline-block w-12">{s.slotId}</strong>
                        {s.roleFit && <BadgeDot state={s.roleFit.badge} />} {s.playerName ?? '—'}{' '}
                        <span className="text-xs text-slate-500">
                          {shortRole(s.roleName)} · %{s.roleFit ? Math.round(s.roleFit.score) : 0}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {s.depth.length > 0 ? `yedek: ${s.depth.map((d) => `${d.playerName} %${Math.round(d.roleFitScore)}`).join(', ')}` : 'yedek yok'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">Yedek kulübesi ({bench.length})</h4>
                <ul className="space-y-1 text-sm">
                  {bench.map((b) => (
                    <li key={b.player.player.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <Link to={`/players/${b.player.player.id}`} className="font-medium hover:underline">
                          {b.player.player.name}
                        </Link>{' '}
                        <span className="text-xs text-slate-500">
                          {b.player.player.positions[0]} · {b.player.player.overall}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {b.covers.length > 0
                          ? `yedeği: ${b.covers.map((c) => `${c.slotId} %${Math.round(c.score)}`).join(', ')}`
                          : b.player.player.positions.includes('GK') ? 'yedek kaleci' : 'ilk 11’e yedek değil'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
