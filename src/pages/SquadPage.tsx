import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Career, CareerPlayer, Club, RosterEvent, RosterEventType } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { SquadCards } from '../components/SquadCards'
import { SquadDensity } from '../components/SquadDensity'
import { TacticLineup } from '../components/TacticLineup'
import { analyzeDepth } from '../lib/depth'
import { useTactic } from '../state/tacticStore'
import { TransferDialog } from '../components/TransferDialog'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Spinner } from '../components/ui'
import { formatEur } from '../lib/format'
import { careerStore, useActiveCareerId } from '../state/careerStore'

const EVENT_LABELS: Record<RosterEventType, string> = {
  BUY: 'Transfer',
  SELL: 'Satış',
  LOAN_IN: 'Kiralık alış',
  LOAN_OUT: 'Kiralık verme',
  PROMOTE: 'Altyapıdan yükselme',
}

const GENDER_LABEL: Record<number, string> = { 0: 'Erkek', 1: 'Kadın' }

function useInvalidateCareer() {
  const queryClient = useQueryClient()
  return () => Promise.all(['careers', 'squad', 'events'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
}

function NewCareer() {
  const refresh = useInvalidateCareer()
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club | undefined>()
  const [budget, setBudget] = useState('')
  const [name, setName] = useState('')
  const clubs = useQuery({ queryKey: ['clubs', term], queryFn: () => endpoints.clubs(term), enabled: term.trim().length >= 1 && !club })
  const create = useMutation({
    mutationFn: () => endpoints.createCareer({ clubId: club!.id, budgetEur: budget ? Number(budget) : 0, name: name || undefined }),
    onSuccess: async (career) => {
      await refresh()
      careerStore.set(career.id)
      setClub(undefined)
      setTerm('')
      setBudget('')
      setName('')
    },
  })

  return (
    <Card title="Yeni kariyer">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto] lg:items-end">
        <Field label="Kulüp ara">
          <Input value={club ? club.name : term} onChange={(e) => { setClub(undefined); setTerm(e.target.value) }} placeholder="Kulüp adı…" />
        </Field>
        <Field label="Kariyer adı (isteğe bağlı)">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Örn. Port Vale 2026" />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
        </Field>
        <Button disabled={!club || create.isPending} onClick={() => create.mutate()}>
          Başlat
        </Button>
      </div>
      {!club && (clubs.data ?? []).length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-600">
          {clubs.data!.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setClub(c)}>
                <span>{c.name} {c.gender === 1 && <Pill tone="sky">Kadın</Pill>}</span>
                <span className="text-slate-500">{c.league}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <ErrorBox error={create.error} />
      </div>
    </Card>
  )
}

function CareerSettings({ career }: { career: Career }) {
  const refresh = useInvalidateCareer()
  const [name, setName] = useState(career.name ?? '')
  const [budget, setBudget] = useState(String(career.budgetEur ?? 0))
  const [season, setSeason] = useState(String(career.season ?? 1))

  useEffect(() => {
    setName(career.name ?? '')
    setBudget(String(career.budgetEur ?? 0))
    setSeason(String(career.season ?? 1))
  }, [career.id, career.name, career.budgetEur, career.season])

  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, { name, budgetEur: Number(budget) || 0, season: Number(season) || 1 }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: () => endpoints.deleteCareer(career.id),
    onSuccess: async () => {
      careerStore.set(undefined)
      await refresh()
    },
  })

  return (
    <Card title="Kariyer ayarları" actions={career.gender !== undefined ? <Pill tone="sky">{GENDER_LABEL[career.gender]} futbolu</Pill> : undefined}>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_100px_auto_auto] sm:items-end">
        <Field label="Ad">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
        <Field label="Sezon">
          <Input type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} />
        </Field>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          Kaydet
        </Button>
        <Button
          variant="danger"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`“${career.name || career.clubName}” kariyeri ve tüm hareketleri silinsin mi? Bu geri alınamaz.`)) {
              remove.mutate()
            }
          }}
        >
          Kariyeri sil
        </Button>
      </div>
      <div className="mt-2">
        <ErrorBox error={save.error ?? remove.error} />
      </div>
    </Card>
  )
}

function TransferPanel({ career, squadIds }: { career: Career; squadIds: Set<number> }) {
  const refresh = useInvalidateCareer()
  const [term, setTerm] = useState('')
  const [fee, setFee] = useState('')
  const search = useQuery({
    queryKey: ['transfer-search', term, career.gender],
    queryFn: () => endpoints.players({ q: term, size: 8, gender: career.gender }),
    enabled: term.trim().length >= 2,
  })
  const apply = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number; feeEur?: number }) => endpoints.applyEvent(career.id, v),
    onSuccess: refresh,
  })
  const feeValue = fee ? Number(fee) : 0

  return (
    <Card title="Transfer piyasası">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Oyuncu ara">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="En az 2 harf…" />
        </Field>
        <Field label="Bedel (€)">
          <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {(search.data?.items ?? []).map((p) => {
          const owned = squadIds.has(p.id)
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <Link to={`/players/${p.id}`} className="hover:underline">{p.name}</Link>{' '}
                <span className="text-slate-500">({p.overall} · {p.positions[0]} · {p.club ?? '—'})</span>
              </span>
              {owned ? (
                <Pill tone="emerald">Kadroda</Pill>
              ) : (
                <span className="flex gap-1">
                  <Button variant="secondary" disabled={apply.isPending} onClick={() => apply.mutate({ type: 'BUY', playerId: p.id, feeEur: feeValue })}>Satın al</Button>
                  <Button variant="secondary" disabled={apply.isPending} onClick={() => apply.mutate({ type: 'LOAN_IN', playerId: p.id, feeEur: feeValue })}>Kirala</Button>
                  <Button variant="secondary" disabled={apply.isPending} onClick={() => apply.mutate({ type: 'PROMOTE', playerId: p.id })}>Altyapı</Button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-2">
        <ErrorBox error={apply.error} />
      </div>
    </Card>
  )
}

function History({ careerId, events }: { careerId: number; events: RosterEvent[] }) {
  const refresh = useInvalidateCareer()
  const undo = useMutation({ mutationFn: (eventId: number) => endpoints.undoEvent(careerId, eventId), onSuccess: refresh })

  return (
    <Card title="Satış / alış / kiralık geçmişi">
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Henüz hareket yok.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {events.map((e, index) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <Pill tone={e.type === 'SELL' || e.type === 'LOAN_OUT' ? 'rose' : 'emerald'}>{EVENT_LABELS[e.type]}</Pill>{' '}
                <strong>{e.playerName ?? `#${e.playerId}`}</strong>
                {(e.fromClubName || e.toClubName) && (
                  <span className="text-slate-500"> · {e.fromClubName ?? '—'} → {e.toClubName ?? '—'}</span>
                )}
                {e.feeEur ? <span> · {formatEur(e.feeEur)}</span> : null}
              </span>
              {index === 0 && (
                <Button variant="ghost" disabled={undo.isPending} onClick={() => undo.mutate(e.id)}>
                  Geri al
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <ErrorBox error={undo.error} />
      </div>
    </Card>
  )
}

export function SquadPage() {
  const careerId = useActiveCareerId()
  const refresh = useInvalidateCareer()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId)
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined })
  const events = useQuery({ queryKey: ['events', careerId], queryFn: () => endpoints.events(careerId!), enabled: careerId !== undefined })
  const [tab, setTab] = useState<SquadTab>('squad')
  const [dialog, setDialog] = useState<{ mode: 'SELL' | 'LOAN_OUT'; entry: CareerPlayer } | null>(null)
  const move = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number; feeEur: number; toClubId?: number }) => endpoints.applyEvent(careerId!, v),
    onSuccess: async () => {
      setDialog(null)
      await refresh()
    },
  })
  const positionAdvice = useQuery({ queryKey: ['position-advice', careerId, squad.data?.length], queryFn: () => endpoints.positionAdvice(careerId!), enabled: careerId !== undefined && (squad.data?.length ?? 0) > 0, staleTime: 120_000 })
  const tactic = useTactic()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: Infinity })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: Infinity })
  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const needs = formation ? analyzeDepth(squad.data ?? [], formation, tactic, roles.data ?? []) : []
  const squadIds = new Set((squad.data ?? []).map((s) => s.player.id))

  return (
    <div className="space-y-4">
      <CareerSelect />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'squad', label: `Kadro (${squad.data?.length ?? 0})` },
          { id: 'lineup', label: 'İlk 11 & Yedekler' },
          { id: 'moves', label: `Transferler & Geçmiş (${events.data?.length ?? 0})` },
          { id: 'career', label: 'Kariyer' },
        ]}
      />
      {tab === 'career' && (
        <>
          <NewCareer />
          {career && <CareerSettings career={career} />}
        </>
      )}
      {career && tab === 'squad' && (
        <>
          <Card title="Bölgesel yoğunluk">
            {(squad.data ?? []).length === 0 ? <EmptyState>Kadro boş.</EmptyState> : <SquadDensity squad={squad.data ?? []} needs={needs} />}
          </Card>
          <Card title={`Oyuncular · ${squad.data?.length ?? 0}`}>
            {squad.isLoading ? (
              <Spinner />
            ) : (squad.data ?? []).length === 0 ? (
              <EmptyState>Kadro boş. “Transferler & Geçmiş” sekmesinden oyuncu al.</EmptyState>
            ) : (
              <SquadCards
                squad={squad.data!}
                busy={move.isPending}
                needs={needs}
                positionAdvice={positionAdvice.data ?? []}
                onSell={(entry) => { move.reset(); setDialog({ mode: 'SELL', entry }) }}
                onLoanOut={(entry) => { move.reset(); setDialog({ mode: 'LOAN_OUT', entry }) }}
              />
            )}
          </Card>
        </>
      )}
      {career && tab === 'lineup' && formations.data && <TacticLineup careerId={career.id} squad={squad.data ?? []} formations={formations.data} />}
      {career && tab === 'moves' && (
        <>
          <History careerId={career.id} events={events.data ?? []} />
          <TransferPanel career={career} squadIds={squadIds} />
        </>
      )}
      {!career && tab !== 'career' && <EmptyState>Önce “Kariyer” sekmesinden bir kariyer seç veya oluştur.</EmptyState>}
      {dialog && (
        <TransferDialog
          mode={dialog.mode}
          entry={dialog.entry}
          gender={career?.gender}
          pending={move.isPending}
          error={move.error}
          onClose={() => setDialog(null)}
          onSubmit={(v) => move.mutate({ type: dialog.mode, playerId: dialog.entry.player.id, ...v })}
        />
      )}
    </div>
  )
}

type SquadTab = 'squad' | 'lineup' | 'moves' | 'career'

function Tabs({ value, onChange, items }: { value: SquadTab; onChange: (tab: SquadTab) => void; items: { id: SquadTab; label: string }[] }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === item.id ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-400' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
