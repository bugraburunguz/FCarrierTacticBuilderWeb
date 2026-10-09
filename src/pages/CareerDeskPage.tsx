import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Career, CareerBackup } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { Button, Card, EmptyState, ErrorBox, Field, HelpPopover, Input, Pill, Select, Skeleton, Stat } from '../components/ui'
import { ageProfile, alerts, depthRows, GROUP_LABEL, suggestActions, weakSlots } from '../lib/deskRules'
import { formatEur } from '../lib/format'
import { toTacticRequest, useTactic } from '../state/tacticStore'
import { useActiveCareerId } from '../state/careerStore'

const KIND_LABEL = { FILL: 'Transfer', SELL: 'Satış', LOAN: 'Kiralık', DEPTH: 'Derinlik' } as const

function daysLeft(date?: string): number | undefined {
  return date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000) : undefined
}

/** Menajer Masası (CAR-20): taktik uyumu, bu dönemin 3 işi, kadro sağlığı, uyarılar ve zaman çizelgesi tek ekranda. */
export function CareerDeskPage() {
  const careerId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const tactic = useTactic()
  const request = toTacticRequest(tactic)

  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const lineup = useQuery({
    queryKey: ['lineup', id, squad.data?.length, JSON.stringify(request)],
    queryFn: () => endpoints.lineup(id!, request),
    enabled: id !== undefined && (squad.data?.length ?? 0) >= 11,
    retry: false,
  })
  const diff = useQuery({ queryKey: ['snapshot-diff', id], queryFn: () => endpoints.snapshotDiff(id!), enabled: id !== undefined, retry: false })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const events = useQuery({ queryKey: ['events', id], queryFn: () => endpoints.events(id!), enabled: id !== undefined, retry: false })

  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const slots = lineup.data?.slots ?? []
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
        <Stat label="Taktik uyumu" value={lineup.data ? `%${Math.round(lineup.data.squadFit)}` : '—'} />
        <Stat label="Transfer bütçesi" value={formatEur(career.budgetEur)} />
        <Stat label="Maaş bütçesi" value={career.wageBudgetEur !== undefined ? formatEur(career.wageBudgetEur) : '—'} />
        <Stat label="Dönem" value={window === undefined ? '—' : window < 0 ? 'kapalı' : `${window} gün`} tone={window !== undefined && window >= 0 && window <= 7 ? 'bad' : undefined} />
        <Stat label="Son import" value={last ? new Date(last.takenAt).toLocaleDateString('tr-TR') : '—'} suffix={last?.source === 'MANUAL' ? 'elle' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Bu dönemin 3 işi" actions={<HelpPopover>Zayıf halkalar, satış değeri ve genç gelişimi kurallarından; her öneri gerekçesiyle birlikte gelir.</HelpPopover>}>
          {lineup.isLoading || squad.isLoading ? (
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
          <ErrorBox error={lineup.error} />
        </Card>

        <Card title="Zayıf halkalar ve uyarılar">
          {weak.length > 0 ? (
            <ul className="mb-3 grid gap-1.5 text-sm">
              {weak.slice(0, 5).map((w) => (
                <li key={w.slotId} className="flex items-center justify-between rounded-md bg-danger-soft px-2.5 py-1 text-danger">
                  <span>{w.position} · {w.playerName ?? 'boş'}</span><span className="num font-semibold">%{w.fit}</span>
                </li>
              ))}
            </ul>
          ) : (
            lineup.data && <p className="mb-3 text-sm text-muted">Zayıf halka yok: ilk 11'in hepsi rolüne %70 üstünde uyumlu.</p>
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

      <DeskSettings career={career} />
    </div>
  )
}

function Timeline({ events, snapshots }: { events: { id: number; type: string; playerName?: string; feeEur?: number; createdAt?: string }[]; snapshots: { id: number; takenAt: string; source: string; playerCount: number }[] }) {
  const rows = [
    ...snapshots.map((s) => ({ key: `s${s.id}`, at: s.takenAt, text: `${s.source === 'IMPORT' ? 'Import' : 'Elle güncelleme'} · ${s.playerCount} oyuncu` })),
    ...events.map((e) => ({ key: `e${e.id}`, at: e.createdAt ?? '', text: `${e.type} · ${e.playerName ?? ''}${e.feeEur ? ` · ${formatEur(e.feeEur)}` : ''}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  if (rows.length === 0) {
    return <EmptyState>Henüz kayıt yok. İlk transferi ya da import'u yapınca burada görünür.</EmptyState>
  }
  return (
    <ol className="space-y-1.5 border-l border-line pl-3 text-sm">
      {rows.map((r) => (
        <li key={r.key}><span className="num text-xs text-muted">{r.at ? new Date(r.at).toLocaleDateString('tr-TR') : '—'}</span> {r.text}</li>
      ))}
    </ol>
  )
}

/** Kariyer ayarları (spoiler, bütçe, dönem, challenge) ve JSON yedek: telefonda tek elle erişilir, hiçbir şey kaybolmaz (13 İlke 3). */
function DeskSettings({ career }: { career: Career }) {
  const client = useQueryClient()
  const [spoiler, setSpoiler] = useState(career.spoilerMode ?? 'SHOW')
  const [wage, setWage] = useState(String(career.wageBudgetEur ?? ''))
  const [windowEnds, setWindowEnds] = useState(career.windowEndsOn ?? '')
  const [challenge, setChallenge] = useState(career.challengeId ?? '')
  const [notice, setNotice] = useState<string>()
  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, { spoilerMode: spoiler, wageBudgetEur: wage === '' ? undefined : Number(wage), windowEndsOn: windowEnds || undefined, challengeId: challenge }),
    onSuccess: () => {
      setNotice('Kaydedildi.')
      ;['careers', 'squad', 'lineup'].forEach((k) => client.invalidateQueries({ queryKey: [k] }))
    },
  })
  const backup = useMutation({
    mutationFn: () => endpoints.careerBackup(career.id),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `fcareer-kariyer-${career.id}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setNotice('Yedek indirildi.')
    },
  })
  const restore = useMutation({
    mutationFn: async (file: File) => endpoints.careerRestore(career.id, JSON.parse(await file.text()) as CareerBackup),
    onSuccess: (data) => {
      setNotice(`Yedek yüklendi: ${data.tags.length} etiket, ${data.shortlist.length} kısa liste, ${data.seasons.length} sezon.`)
      client.invalidateQueries()
    },
  })
  return (
    <Card title="Kariyer ayarları ve yedek">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Potansiyel gösterimi">
          <Select value={spoiler} onChange={(e) => setSpoiler(e.target.value as 'SHOW' | 'SCOUT_RANGE')}>
            <option value="SHOW">Tam sayı (spoiler açık)</option>
            <option value="SCOUT_RANGE">Scout aralığı (ör. 80–84)</option>
          </Select>
        </Field>
        <Field label="Maaş bütçesi (€/hf)"><Input type="number" min={0} value={wage} onChange={(e) => setWage(e.target.value)} /></Field>
        <Field label="Transfer dönemi bitişi"><Input type="date" value={windowEnds} onChange={(e) => setWindowEnds(e.target.value)} /></Field>
        <Field label="Challenge (isteğe bağlı)"><Input value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="Road to Glory" maxLength={40} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        <Button variant="secondary" onClick={() => backup.mutate()} disabled={backup.isPending}>JSON yedeği indir</Button>
        <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">
          Yedekten yükle
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore.mutate(f) }} />
        </label>
        {notice && <span role="status" className="text-xs text-muted">{notice}</span>}
      </div>
      <div className="mt-2"><ErrorBox error={save.error ?? backup.error ?? restore.error} /></div>
      <p className="mt-2 text-xs text-muted">Yedek etiketlerini, kısa listeni ve sezon kayıtlarını içerir; oyuncu verisi Live Editor import'undan yeniden gelir.</p>
    </Card>
  )
}
