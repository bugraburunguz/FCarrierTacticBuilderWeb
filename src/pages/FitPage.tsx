import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { ErrorCodes, ApiError } from '../api/client'
import type { RuleFinding } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { PitchView } from '../components/PitchView'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Pill, ScoreBar } from '../components/ui'
import { scoutLink } from '../lib/scout'
import { useActiveCareerId } from '../state/careerStore'
import { toTacticRequest, useTactic } from '../state/tacticStore'

const RULE_TONE: Record<RuleFinding['severity'], 'rose' | 'amber' | 'emerald'> = { RISK: 'rose', WARN: 'amber', PLUS: 'emerald' }
const RULE_LABEL: Record<RuleFinding['severity'], string> = { RISK: 'Risk', WARN: 'Uyarı', PLUS: 'Artı' }

export function FitPage() {
  const tactic = useTactic()
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const run = useMutation({
    mutationFn: () => endpoints.fitSquad({ careerId: careerId!, tactic: toTacticRequest(tactic) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const result = run.data?.result

  const info = Object.fromEntries(
    (result?.slots ?? []).map((s) => [s.slotId, { title: s.playerName ?? 'Boş', subtitle: s.roleFit ? `${Math.round(s.roleFit.score)}%` : undefined, badge: s.roleFit?.badge }]),
  )
  const outOfCredit = run.error instanceof ApiError && run.error.code === ErrorCodes.insufficientCredit

  return (
    <div className="space-y-4">
      <Card title="Analiz">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <CareerSelect />
          <Button disabled={careerId === undefined || run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? 'Hesaplanıyor…' : 'Kadro uyumunu hesapla'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Taktik: <strong>{tactic.formation}</strong>
          {tactic.presetId ? ` · ${tactic.presetId}` : ''} — <Link to="/tactics/builder" className="text-emerald-700 underline">düzenle</Link>. Bu işlem kredi harcar; teknik hatada iade edilir.
        </p>
        <div className="mt-2">
          <ErrorBox error={run.error} />
          {outOfCredit && (
            <p className="mt-2 text-sm">
              Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-emerald-700 underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
            </p>
          )}
        </div>
      </Card>

      {!result ? (
        <EmptyState>Kariyerini ve taktiğini seçip hesapla; kimin hangi slotta oynadığını, zayıf halkaları ve riskleri göreceksin.</EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,440px)_1fr]">
            <div className="space-y-3">{formation && <PitchView slots={formation.slots} info={info} />}</div>
            <div className="space-y-4">
              <Card title="Genel uyum">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ScoreBar label="SquadFit" value={result.squadFit} hint="Kadro bu rollere uyuyor mu?" />
                  <ScoreBar label="IntentFit" value={result.intentFit} hint={result.intentFit === undefined ? 'Slotlara davranış seçersen hesaplanır' : 'Seçtiğin oyunu oynayabiliyor mu?'} />
                </div>
                <p className="mt-3 text-sm">{result.summary}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{result.attackPattern}</p>
                {run.data && run.data.charged > 0 && <p className="mt-2 text-xs text-slate-500">{run.data.charged} kredi harcandı{run.data.balance !== undefined ? ` · kalan ${run.data.balance}` : ''}.</p>}
              </Card>
              <Card title="Zayıf halkalar">
                {result.weakLinks.length === 0 ? (
                  <p className="text-sm text-emerald-700">Zayıf halka yok — tüm slotlar rolüne uygun.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {result.weakLinks.map((w) => (
                      <li key={w.slotId} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <BadgeDot state={w.badge} /> {w.sentence}
                        </span>
                        <Link to={scoutLink(w.scoutQuery)} className="text-emerald-700 underline">
                          Scout et
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {result.rules.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.rules.map((r) => (
                <Card key={r.ruleId} title={<span><Pill tone={RULE_TONE[r.severity]}>{RULE_LABEL[r.severity]}</Pill> {r.title}</span>}>
                  <p className="text-sm">{r.message}</p>
                  {r.fix && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Çözüm: {r.fix}</p>}
                </Card>
              ))}
            </div>
          )}

          <Card title="Slot detayları">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="py-1">Slot</th><th>Rol</th><th>Oyuncu</th><th>RoleFit</th><th>Bu rolde</th><th>IntentFit</th><th>Yedekler</th></tr>
                </thead>
                <tbody>
                  {result.slots.map((s) => (
                    <tr key={s.slotId} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="py-1.5 font-medium">{s.slotId}</td>
                      <td>{s.roleName}</td>
                      <td>{s.playerName ?? '—'}</td>
                      <td>{s.roleFit ? <><BadgeDot state={s.roleFit.badge} /> %{Math.round(s.roleFit.score)}</> : '—'}</td>
                      <td className="tabular-nums">{s.roleFit?.projectedRating ?? '—'}</td>
                      <td>{s.intentFit ? `%${s.intentFit.score}` : '—'}</td>
                      <td className="text-xs text-slate-500">{s.depth.map((d) => `${d.playerName} (%${Math.round(d.roleFitScore)})`).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
              {result.slots.filter((s) => s.roleFit && s.roleFit.badge !== 'GREEN').map((s) => (
                <li key={s.slotId}>
                  <strong>{s.slotId}:</strong> {s.roleFit!.badgeText}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
