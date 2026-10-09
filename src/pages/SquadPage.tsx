import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Career, CareerPlayer, RosterEvent, RosterEventType } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { MoneyInput } from '../components/MoneyInput'
import { NewCareerForm } from '../components/NewCareerForm'
import { SquadCards } from '../components/SquadCards'
import { SquadTagsView } from '../components/SquadTagsView'
import { SquadList } from '../components/SquadList'
import { SquadDensity } from '../components/SquadDensity'
import { TacticLineup } from '../components/TacticLineup'
import { analyzeDepth } from '../lib/depth'
import { bestSquadRating, starRating } from '../lib/squadRating'
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
  return (
    <Card title="Yeni kariyer">
      <NewCareerForm />
    </Card>
  )
}

function CareerSettings({ career }: { career: Career }) {
  const refresh = useInvalidateCareer()
  const [name, setName] = useState(career.name ?? '')
  const [budget, setBudget] = useState<number | undefined>(career.budgetEur ?? 0)
  const [season, setSeason] = useState(String(career.season ?? 1))

  useEffect(() => {
    setName(career.name ?? '')
    setBudget(career.budgetEur ?? 0)
    setSeason(String(career.season ?? 1))
  }, [career.id, career.name, career.budgetEur, career.season])

  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, { name, budgetEur: budget ?? 0, season: Number(season) || 1 }),
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
      <div className="grid gap-3 sm:grid-cols-[1fr_300px_100px_auto_auto] sm:items-start">
        <Field label="Ad">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <MoneyInput key={career.id} value={budget} onChange={setBudget} />
        </Field>
        <Field label="Sezon">
          <Input type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} />
        </Field>
        <Button className="sm:mt-[22px]" disabled={save.isPending} onClick={() => save.mutate()}>
          Kaydet
        </Button>
        <Button
          variant="danger"
          className="sm:mt-[22px]"
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
                <span className="text-muted">({p.overall} · {p.positions[0]} · {p.club ?? '—'})</span>
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
        <p className="text-sm text-muted">Henüz hareket yok.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {events.map((e, index) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <Pill tone={e.type === 'SELL' || e.type === 'LOAN_OUT' ? 'rose' : 'emerald'}>{EVENT_LABELS[e.type]}</Pill>{' '}
                <strong>{e.playerName ?? `#${e.playerId}`}</strong>
                {(e.fromClubName || e.toClubName) && (
                  <span className="text-muted"> · {e.fromClubName ?? '—'} → {e.toClubName ?? '—'}</span>
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
  const [view, setView] = useState<'list' | 'cards' | 'tags'>('list')
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
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] max-w-xs flex-1"><CareerSelect /></div>
        <div className="flex-1">
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
        </div>
      </div>
      {tab === 'career' && (
        <>
          <NewCareer />
          {career && <CareerSettings career={career} />}
        </>
      )}
      {career && tab === 'squad' && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(420px,500px)_1fr]">
          <div className="lg:sticky lg:top-24">
            {(squad.data ?? []).length > 0 && (
              <Card title="Kadro rating'i">
                {(() => {
                  const { rating, counted } = bestSquadRating((squad.data ?? []).filter((s) => !s.loanedOut).map((s) => s.player.overall))
                  return (
                    <p className="text-sm">
                      <span className="text-2xl font-bold tabular-nums">{rating}</span> · {starRating(rating)} yıldız
                      <span className="block text-xs text-muted">En iyi {counted} oyuncu (11 ilk + 7 yedek) ortalaması + ortalamanın üstündekilere düzeltme. Rehber formülüdür; oyun içi değer esastır.</span>
                    </p>
                  )
                })()}
              </Card>
            )}
            <Card title="Bölgesel yoğunluk">
              {(squad.data ?? []).length === 0 ? <EmptyState>Kadro boş.</EmptyState> : <SquadDensity squad={squad.data ?? []} needs={needs} formation={formation} compact />}
            </Card>
          </div>
          <Card
            title={`Oyuncular · ${squad.data?.length ?? 0}`}
            actions={
              <div role="tablist" className="flex gap-1">
                {(['list', 'cards', 'tags'] as const).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${view === v ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-muted'}`}>
                    {v === 'list' ? 'Tam liste' : v === 'cards' ? 'Kartlar (sat/kirala)' : 'Etiket & yaş'}
                  </button>
                ))}
              </div>
            }
          >
            {squad.isLoading ? (
              <Spinner />
            ) : (squad.data ?? []).length === 0 ? (
              <EmptyState>Kadro boş. “Transferler & Geçmiş” sekmesinden oyuncu al.</EmptyState>
            ) : view === 'tags' ? (
              <SquadTagsView careerId={career.id} squad={squad.data!} />
            ) : view === 'list' ? (
              <SquadList squad={squad.data!} positionAdvice={positionAdvice.data ?? []} />
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
        </div>
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
    <div role="tablist" className="flex flex-wrap gap-1 rounded-md bg-surface-2 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${value === item.id ? 'bg-surface text-accent ' : 'text-muted hover:text-ink'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
