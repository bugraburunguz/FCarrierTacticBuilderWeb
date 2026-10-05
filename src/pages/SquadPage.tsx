import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Club, RosterEventType } from '../api/types'
import { CareerSelect } from '../components/CareerSelect'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill, Spinner } from '../components/ui'
import { formatEur } from '../lib/format'
import { careerStore, useActiveCareerId } from '../state/careerStore'

const EVENT_LABELS: Record<RosterEventType, string> = {
  BUY: 'Transfer (alış)',
  SELL: 'Satış',
  LOAN_IN: 'Kiralık alış',
  LOAN_OUT: 'Kiralık verme',
  PROMOTE: 'Altyapıdan yükselme',
}

function NewCareer() {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club | undefined>()
  const [budget, setBudget] = useState('')
  const clubs = useQuery({ queryKey: ['clubs', term], queryFn: () => endpoints.clubs(term), enabled: term.trim().length >= 1 && !club })
  const create = useMutation({
    mutationFn: () => endpoints.createCareer({ clubId: club!.id, budgetEur: budget ? Number(budget) : 0 }),
    onSuccess: async (career) => {
      await queryClient.invalidateQueries({ queryKey: ['careers'] })
      careerStore.set(career.id)
      setClub(undefined)
      setTerm('')
      setBudget('')
    },
  })

  return (
    <Card title="Yeni kariyer">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Field label="Kulüp ara">
          <Input value={club ? club.name : term} onChange={(e) => { setClub(undefined); setTerm(e.target.value) }} placeholder="Kulüp adı…" />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
        </Field>
        <Button disabled={!club || create.isPending} onClick={() => create.mutate()}>
          Başlat
        </Button>
      </div>
      {!club && (clubs.data ?? []).length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
          {clubs.data!.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setClub(c)}>
                <span>{c.name}</span>
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

function TransferPanel({ careerId, squadIds }: { careerId: number; squadIds: Set<number> }) {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [fee, setFee] = useState('')
  const search = useQuery({ queryKey: ['transfer-search', term], queryFn: () => endpoints.players({ q: term, size: 8 }), enabled: term.trim().length >= 2 })
  const apply = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number; feeEur?: number }) => endpoints.applyEvent(careerId, v),
    onSuccess: async () => {
      await Promise.all(['careers', 'squad', 'events'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
    },
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
                <span className="text-slate-500">({p.overall} · {p.positions[0]} · {p.club ?? '—'} · {formatEur(p.valueEur)})</span>
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

export function SquadPage() {
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined })
  const events = useQuery({ queryKey: ['events', careerId], queryFn: () => endpoints.events(careerId!), enabled: careerId !== undefined })
  const [sellFee, setSellFee] = useState('')
  const sell = useMutation({
    mutationFn: (v: { type: RosterEventType; playerId: number }) => endpoints.applyEvent(careerId!, { ...v, feeEur: sellFee ? Number(sellFee) : 0 }),
    onSuccess: async () => {
      await Promise.all(['careers', 'squad', 'events'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
    },
  })
  const squadIds = new Set((squad.data ?? []).map((s) => s.player.id))

  return (
    <div className="space-y-4">
      <NewCareer />
      <CareerSelect />
      {careerId !== undefined && (
        <>
          <Card title="Kadro" actions={<Field label="Satış bedeli (€)"><Input type="number" min={0} className="w-36" value={sellFee} onChange={(e) => setSellFee(e.target.value)} placeholder="0" /></Field>}>
            {squad.isLoading ? (
              <Spinner />
            ) : (squad.data ?? []).length === 0 ? (
              <EmptyState>Kadro boş. Aşağıdan oyuncu al.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr><th className="py-1">Oyuncu</th><th>Mevki</th><th>GEN</th><th>POT*</th><th>Değer*</th><th /></tr>
                  </thead>
                  <tbody>
                    {squad.data!.map((s) => (
                      <tr key={s.player.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 font-medium">
                          <Link to={`/players/${s.player.id}`} className="hover:underline">{s.player.name}</Link> {s.onLoan && <Pill tone="amber">Kiralık</Pill>}
                        </td>
                        <td>{s.player.positions.slice(0, 2).join(', ')}</td>
                        <td className="font-semibold tabular-nums">{s.player.overall}</td>
                        <td className="tabular-nums">{s.dynamicPotential ?? '—'}</td>
                        <td>{formatEur(s.valueEur)}</td>
                        <td className="text-right">
                          <Button variant="ghost" disabled={sell.isPending} onClick={() => sell.mutate({ type: 'SELL', playerId: s.player.id })}>Sat</Button>
                          <Button variant="ghost" disabled={sell.isPending} onClick={() => sell.mutate({ type: 'LOAN_OUT', playerId: s.player.id })}>Kiralık ver</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-2"><ErrorBox error={sell.error} /></div>
          </Card>
          <TransferPanel careerId={careerId} squadIds={squadIds} />
          <Card title="Hareket geçmişi">
            {(events.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Henüz hareket yok.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {events.data!.map((e) => (
                  <li key={e.id}>
                    {EVENT_LABELS[e.type]} · oyuncu #{e.playerId} {e.feeEur ? `· ${formatEur(e.feeEur)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
