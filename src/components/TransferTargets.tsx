import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Acquisition, ResolvedSlot } from '../api/types'
import { formatEur } from '../lib/format'
import { POSITION_ORDER } from '../lib/positions'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Pill, Spinner } from './ui'
import { CompareButton } from './CompareButton'
import { FitMeter } from './FitMeter'

const ACQUISITION: Record<Acquisition, { label: string; tone: 'emerald' | 'sky' | 'amber' }> = {
  FREE: { label: 'Bedava', tone: 'emerald' },
  LOAN: { label: 'Kiralık', tone: 'sky' },
  BUY: { label: 'Satın al', tone: 'amber' },
}

interface Props {
  careerId?: number
  slots: ResolvedSlot[]
}

export function TransferTargets({ careerId, slots }: Props) {
  const run = useMutation({
    mutationFn: () => {
      const byPosition = new Map<string, ResolvedSlot>()
      slots.forEach((s) => byPosition.has(s.position) || byPosition.set(s.position, s))
      const ordered = [...byPosition.values()].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
      return endpoints.transferTargets({
        careerId: careerId!,
        perPosition: 3,
        slots: ordered.map((s) => ({ position: s.position, roleId: s.roleId, tags: s.tags })),
      })
    },
  })
  const result = run.data

  return (
    <Card
      title="Otomatik transfer hedefleri"
      actions={
        <Button disabled={careerId === undefined || slots.length === 0 || run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? 'Aranıyor…' : 'Hedefleri bul'}
        </Button>
      }
    >
      <p className="mb-3 text-xs text-slate-500">
        Seçili taktiğin her mevkii için 3 hedef: bedava, kiralık ve satın alınabilir adaylar. Yalnızca liguna gelebilecek oyuncular: kadro seviyene yakın ve ligin kalite bandında olanlar, serbest oyuncular, büyük kulüplerin genç yetenekleri ve düşük overall–yüksek potansiyelli oyuncular. Ücretsiz.
      </p>
      {careerId === undefined && <EmptyState>Önce bir kariyer seç.</EmptyState>}
      {run.isPending && <Spinner />}
      <ErrorBox error={run.error} />
      {result && result.positions.length === 0 && <EmptyState>Kadro boş; hedef üretilemedi.</EmptyState>}
      {result && result.positions.length > 0 && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Kadro ortalaması (ilk 18): <b>{result.squadAverage?.toFixed(1)}</b> · bütçe: <b>{formatEur(result.budgetEur)}</b>
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.positions.map((group) => (
              <section key={group.position} className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <h3 className="mb-1.5 text-sm font-semibold">{group.position}</h3>
                {group.targets.length === 0 ? (
                  <p className="text-xs text-slate-500">Bu mevki için uygun aday bulunamadı.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {group.targets.map((t) => (
                      <li key={t.player.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <BadgeDot state={t.roleFit.badge} />{' '}
                            <Link to={`/players/${t.player.id}`} className="font-medium hover:underline">
                              {t.player.name}
                            </Link>{' '}
                            <span className="text-xs text-slate-500">
                              {t.player.age ? `${t.player.age}y · ` : ''}{t.player.overall}/{t.player.potential ?? '—'}
                              {t.player.club ? ` · ${t.player.club}` : ''}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <Pill tone={ACQUISITION[t.acquisition].tone}>{ACQUISITION[t.acquisition].label}</Pill>
                            <FitMeter score={t.combined} badge={t.roleFit.badge} size={36} />
                            <CompareButton compact entry={{ id: t.player.id, name: t.player.name, overall: t.player.overall, position: t.player.positions[0] ?? '' }} />
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{t.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
