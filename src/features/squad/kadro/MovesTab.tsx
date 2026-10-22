import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import type { Career, RosterEvent, RosterEventType } from '../../../api/types'
import { ErrorBox, Field, Input } from '../../../components/ui'
import { Button, Chip, EmptyState, Panel } from '../../../design/components/primitives'
import { formatEur } from '../../../lib/format'
import { useInvalidateCareer } from '../../careerSquad/useCareerSquadData'

export const EVENT_LABELS: Record<RosterEventType, string> = {
  BUY: 'Transfer',
  SELL: 'Satış',
  LOAN_IN: 'Kiralık alış',
  LOAN_OUT: 'Kiralık verme',
  PROMOTE: 'Altyapıdan yükselme',
}

/** Satış / alış / kiralık geçmişi: yalnız en son hareket geri alınabilir (v2 ile aynı). */
export function MoveHistory({ careerId, events }: { careerId: number; events: RosterEvent[] }) {
  const refresh = useInvalidateCareer()
  const undo = useMutation({ mutationFn: (eventId: number) => endpoints.undoEvent(careerId, eventId), onSuccess: refresh })
  return (
    <Panel title="Satış / alış / kiralık geçmişi">
      {events.length === 0 ? (
        <EmptyState>Henüz hareket yok. Transfer piyasasından oyuncu al ya da kadrodan sat.</EmptyState>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] text-sm">
          {events.map((e, index) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <Chip tone={e.type === 'SELL' || e.type === 'LOAN_OUT' ? 'bad' : 'good'}>{EVENT_LABELS[e.type]}</Chip>
                <strong className="font-semibold">{e.playerName ?? `#${e.playerId}`}</strong>
                {(e.fromClubName || e.toClubName) && <span className="text-ink-2">{e.fromClubName ?? '—'} → {e.toClubName ?? '—'}</span>}
                {e.feeEur ? <span className="font-[var(--font-num)] tabular-nums">{formatEur(e.feeEur)}</span> : null}
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
      <ErrorBox error={undo.error} />
    </Panel>
  )
}

/** Transfer piyasası: oyuncu ara, bedel gir; satın al / kirala / altyapıdan yükselt (kadrodakiler işaretli). */
export function TransferMarket({ career, squadIds }: { career: Career; squadIds: Set<number> }) {
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
    <Panel title="Transfer piyasası">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Oyuncu ara">
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="En az 2 harf…" />
        </Field>
        <Field label="Bedel (€)">
          <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="Bedelsiz" />
        </Field>
      </div>
      <ul className="mt-2 divide-y divide-[var(--glass-border)] text-sm">
        {(search.data?.items ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <Link to={`/players/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{' '}
              <span className="text-ink-2">{p.overall} · {p.positions[0]} · {p.club ?? '—'}</span>
            </span>
            {squadIds.has(p.id) ? (
              <Chip tone="good">Kadroda</Chip>
            ) : (
              <span className="flex flex-wrap gap-1">
                <Button disabled={apply.isPending} onClick={() => apply.mutate({ type: 'BUY', playerId: p.id, feeEur: feeValue })}>Satın al</Button>
                <Button disabled={apply.isPending} onClick={() => apply.mutate({ type: 'LOAN_IN', playerId: p.id, feeEur: feeValue })}>Kirala</Button>
                <Button disabled={apply.isPending} onClick={() => apply.mutate({ type: 'PROMOTE', playerId: p.id })}>Altyapı</Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <ErrorBox error={apply.error} />
    </Panel>
  )
}
