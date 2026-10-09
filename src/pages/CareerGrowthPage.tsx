import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Select, Skeleton } from '../components/ui'
import { useActiveCareerId } from '../state/careerStore'

/** Gelişim (CAR-24): iki kayıt arası fark, oyuncu OVR geçmişi ve oyun içinden elle hızlı OVR/POT güncellemesi. */
export function CareerGrowthPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const [params, setParams] = useSearchParams()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const diff = useQuery({ queryKey: ['snapshot-diff', id, snapshots.data?.length], queryFn: () => endpoints.snapshotDiff(id!), enabled: id !== undefined && (snapshots.data?.length ?? 0) >= 2, retry: false })

  const selectedId = Number(params.get('player')) || squad.data?.[0]?.player.id
  const history = useQuery({ queryKey: ['history', id, selectedId], queryFn: () => endpoints.playerHistory(id!, selectedId!), enabled: id !== undefined && selectedId !== undefined, retry: false })
  const selected = squad.data?.find((c) => c.player.id === selectedId)

  const [overall, setOverall] = useState('')
  const [potential, setPotential] = useState('')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: () => endpoints.updateRatings(id!, { updates: [{ playerId: selectedId!, overall: Number(overall), potential: potential === '' ? undefined : Number(potential) }], note: note || undefined }),
    onSuccess: () => {
      setOverall(''); setPotential(''); setNote('')
      for (const key of ['squad', 'snapshots', 'snapshot-diff', 'history']) {
        client.invalidateQueries({ queryKey: [key] })
      }
    },
  })

  const points = history.data ?? []
  const chart = useMemo(() => {
    if (points.length < 2) {
      return undefined
    }
    const values = points.flatMap((p) => [p.overall, p.potential])
    const lo = Math.min(...values) - 2
    const hi = Math.max(...values) + 2
    const x = (i: number) => 10 + (i / (points.length - 1)) * 280
    const y = (v: number) => 90 - ((v - lo) / (hi - lo)) * 80
    const line = (pick: (p: (typeof points)[number]) => number) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ')
    return { ovr: line((p) => p.overall), pot: line((p) => p.potential), lo, hi }
  }, [points])
  const plateau = points.length >= 3 && points.slice(-3).every((p) => p.overall === points[points.length - 1].overall)
  const valid = overall !== '' && Number(overall) >= 1 && Number(overall) <= 99 && (potential === '' || (Number(potential) >= Number(overall) && Number(potential) <= 99))

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return <Card title="Gelişim"><EmptyState action={<Link to="/career/new" className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState></Card>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Card title="Son iki kayıt arası fark">
          {(snapshots.data?.length ?? 0) < 2 ? <EmptyState>Fark için en az iki kayıt gerekir; aşağıdan OVR güncelle ya da yeni save yükle.</EmptyState> : (
            <>
              <ErrorBox error={diff.error} />
              <p className="mb-2 text-xs text-muted">{diff.data?.changed ?? 0} değişim · {diff.data?.transfers ?? 0} transfer · {diff.data?.added ?? 0} yeni · {diff.data?.removed ?? 0} ayrıldı</p>
              <ul className="divide-y divide-line text-sm">
                {(diff.data?.rows ?? []).slice(0, 25).map((r) => {
                  const delta = (r.overallTo ?? 0) - (r.overallFrom ?? 0)
                  return (
                    <li key={`${r.playerId}-${r.kind}`} className="flex items-center justify-between gap-2 py-1.5">
                      <button type="button" className="text-left underline decoration-dotted underline-offset-2" onClick={() => setParams({ player: String(r.playerId) })}>{r.name}</button>
                      <span className="flex items-center gap-2">
                        <Pill tone={r.kind === 'CHANGED' ? 'sky' : r.kind === 'NEW' ? 'emerald' : 'amber'}>{r.kind === 'CHANGED' ? 'Gelişim' : r.kind === 'TRANSFER' ? 'Transfer' : r.kind === 'NEW' ? 'Yeni' : 'Ayrıldı'}</Pill>
                        {r.kind === 'CHANGED' && <span className={`num font-semibold ${delta >= 0 ? 'text-good' : 'text-bad'}`}>{r.overallFrom} → {r.overallTo} ({delta >= 0 ? '+' : ''}{delta})</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Card>

        <Card title={selected ? `Geçmiş · ${selected.player.name}` : 'Geçmiş'}>
          {history.isLoading && <Skeleton className="h-28" />}
          {chart ? (
            <div>
              <svg viewBox="0 0 300 100" className="h-32 w-full" role="img" aria-label="OVR ve potansiyel geçmişi">
                <path d={chart.pot} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="text-muted" />
                <path d={chart.ovr} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" />
              </svg>
              <div className="flex justify-between text-xs text-muted"><span>{chart.lo}–{chart.hi}</span><span><b className="text-accent">━</b> OVR · <b>┅</b> POT</span></div>
              {plateau && <p className="mt-2 text-sm text-warn">Son 3 kayıtta OVR değişmedi — plato; süre/antrenman planını gözden geçir.</p>}
            </div>
          ) : !history.isLoading && <EmptyState>Grafik için bu oyuncuda en az iki kayıt gerekir.</EmptyState>}
        </Card>
      </div>

      <Card title="Hızlı güncelle">
        <div className="space-y-3">
          <Field label="Oyuncu">
            <Select value={selectedId ?? ''} onChange={(e) => setParams({ player: e.target.value })}>
              {(squad.data ?? []).map((c) => <option key={c.player.id} value={c.player.id}>{c.player.name} · {c.player.overall}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="OVR (oyun içi)"><Input type="number" min={1} max={99} inputMode="numeric" value={overall} placeholder={selected ? String(selected.player.overall) : ''} onChange={(e) => setOverall(e.target.value)} /></Field>
            <Field label="POT (opsiyonel)"><Input type="number" min={1} max={99} inputMode="numeric" value={potential} onChange={(e) => setPotential(e.target.value)} /></Field>
          </div>
          <Field label="Not"><Input value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="ör. sezon sonu" /></Field>
          <ErrorBox error={save.error} />
          <Button disabled={!valid || selectedId === undefined || save.isPending} onClick={() => save.mutate()}>Kaydet ve kayıt oluştur</Button>
          <p className="text-xs text-muted">POT, OVR'den küçük olamaz. Her kayıt bir anlık görüntü oluşturur.</p>
        </div>
      </Card>
    </div>
  )
}
