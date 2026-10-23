import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { CareerSelect } from '../components/CareerSelect'
import { Card, EmptyState, HelpPopover, Pill, Skeleton, Stat } from '../components/ui'
import { DeskSettings } from '../features/desk/DeskSettings'
import { Timeline } from '../features/desk/Timeline'
import { ageProfile, alerts, depthRows, GROUP_LABEL, suggestActions, weakSlots } from '../lib/deskRules'
import { useAutoLineup } from '../features/squad/useAutoLineup'
import { useCareerBinding } from './squad/useCareerBinding'
import { teamFitPct, toDeskSlots, useSlotFits } from '../features/squad/useSlotFits'
import { useSquadWorkspace } from '../features/squad/useSquadWorkspace'
import { levelText } from '../lib/fitLabels'
import { formatEur } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'

const KIND_LABEL = { FILL: 'Transfer', SELL: 'Satış', LOAN: 'Kiralık', DEPTH: 'Derinlik', CONTRACT: 'Sözleşme' } as const

function daysLeft(date?: string): number | undefined {
  return date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) : undefined
}

/** Menajer Masası (CAR-20): taktik uyumu, bu dönemin 3 işi, kadro sağlığı, uyarılar ve zaman çizelgesi tek ekranda. */
export function CareerDeskPage() {
  const careerId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id

  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  // Masa, saha ve İhtiyaçlar AYNI kaynaktan okur (v3 levelFit + rozet): aynı oyuncu her ekranda aynı sayı.
  const { binding, playerById } = useCareerBinding(id, squad.data)
  const ws = useSquadWorkspace('career', binding)
  useAutoLineup(ws, id, squad.data?.length ?? 0)
  const { rows: fitRows, pending: fitsPending } = useSlotFits(ws, playerById)
  const diff = useQuery({ queryKey: ['snapshot-diff', id], queryFn: () => endpoints.snapshotDiff(id!), enabled: id !== undefined, retry: false })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const events = useQuery({ queryKey: ['events', id], queryFn: () => endpoints.events(id!), enabled: id !== undefined, retry: false })

  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const slots = useMemo(() => toDeskSlots(fitRows), [fitRows])
  const teamFit = teamFitPct(fitRows.map((r) => r.display))
  const players = squad.data ?? []
  const actions = useMemo(() => suggestActions({ squad: players, slots, tags }), [players, slots, tags])
  const notes = useMemo(() => alerts({ squad: players, slots, tags, diffRows: diff.data?.rows ?? [], windowEndsOn: career?.windowEndsOn }), [players, slots, tags, diff.data, career?.windowEndsOn])
  const ages = useMemo(() => ageProfile(players), [players])
  const depth = useMemo(() => depthRows(players), [players])
  const weak = useMemo(() => weakSlots(slots), [slots])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return (
      <Card title="Menajer Masası">
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>
          Henüz kariyerin yok. Üç dakikada kulübünü seç, masan hazır olsun.
        </EmptyState>
      </Card>
    )
  }
  const window = daysLeft(career.windowEndsOn)
  const last = snapshots.data?.[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CareerSelect />
        <Link to="/career/new" className="text-sm underline">Yeni kariyer</Link>
      </div>

      <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-line bg-line">
        <Stat label="Taktik uyumu" value={teamFit !== undefined ? `%${teamFit}` : '—'} />
        <Stat label="Transfer bütçesi" value={formatEur(career.budgetEur)} />
        <Stat label="Maaş bütçesi" value={career.wageBudgetEur !== undefined ? formatEur(career.wageBudgetEur) : '—'} />
        <Stat label="Dönem" value={window === undefined ? '—' : window < 0 ? 'kapalı' : `${window} gün`} tone={window !== undefined && window >= 0 && window <= 7 ? 'bad' : undefined} />
        <Stat label="Son import" value={last ? new Date(last.takenAt).toLocaleDateString('tr-TR') : '—'} suffix={last?.source === 'MANUAL' ? 'elle' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bu dönemin 3 işi" actions={<HelpPopover>Zayıf halkalar, satış değeri ve genç gelişimi kurallarından; her öneri gerekçesiyle birlikte gelir.</HelpPopover>}>
          {fitsPending || squad.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : actions.length === 0 ? (
            <EmptyState>{players.length < 11 ? 'Öneri için kadroda en az 11 oyuncu olmalı.' : 'Şu an acil bir iş yok: ilk 11 taktiğe uyumlu, derinlik yeterli.'}</EmptyState>
          ) : (
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={`${a.kind}-${a.title}`} className="flex items-start gap-3 rounded-md border border-line p-3">
                  <span className="font-display text-2xl font-extrabold leading-none text-accent">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Pill>{KIND_LABEL[a.kind]}</Pill><b className="truncate">{a.title}</b></div>
                    <p className="mt-1 text-xs text-muted">{a.reason}</p>
                  </div>
                  <Link to={a.to} className="shrink-0 rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-surface-2">Gör</Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Zayıf halkalar ve uyarılar">
          {weak.length > 0 ? (
            <ul className="mb-3 grid gap-1.5 text-sm">
              {weak.slice(0, 5).map((w) => (
                <li key={w.slotId} className="flex items-center justify-between rounded-md bg-danger-soft px-2.5 py-1 text-danger">
                  <span>{w.position} · {w.playerName ?? 'boş'}</span><span className="num font-semibold">{levelText(w.fit)}</span>
                </li>
              ))}
            </ul>
          ) : (
            !fitsPending && slots.length > 0 && <p className="mb-3 text-sm text-muted">Zayıf halka yok: dizilimdeki herkes seviyesinde ya da üstünde.</p>
          )}
          {notes.length === 0 ? <p className="text-sm text-muted">Uyarı yok.</p> : (
            <ul className="space-y-1 text-sm">
              {notes.slice(0, 8).map((n) => <li key={n.text} className={n.tone === 'warn' ? 'text-code' : 'text-muted'}>{n.text}</li>)}
            </ul>
          )}
        </Card>

        <Card title="Kadro sağlığı">
          <p className="mb-2 text-sm text-muted">Yaş ortalaması <b className="num text-ink">{ages.average || '—'}</b></p>
          <div className="mb-4 flex items-end gap-2" role="img" aria-label={`Yaş dağılımı: ${ages.buckets.map((b) => `${b.label} ${b.count}`).join(', ')}`}>
            {ages.buckets.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-accent-bg" style={{ height: `${Math.max(4, b.count * 10)}px`, opacity: 0.85 }} />
                <span className="num text-xs">{b.count}</span>
                <span className="text-[11px] text-muted">{b.label}</span>
              </div>
            ))}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {depth.map((d) => (
                <tr key={d.group} className="border-t border-line">
                  <td className="py-1">{GROUP_LABEL[d.group]}</td>
                  <td className="num text-right">{d.have}/{d.need}</td>
                  <td className="w-24 pl-3 text-right">{d.short > 0 ? <Pill tone="amber">{d.short} eksik</Pill> : <Pill tone="emerald">yeterli</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Zaman çizelgesi">
          <Timeline events={events.data ?? []} snapshots={snapshots.data ?? []} />
        </Card>
      </div>

      <DeskSettings key={career.id} career={career} />
    </div>
  )
}

