import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import type { CareerMove, CareerMoveType } from '../../../api/types'
import { Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../../design/components/primitives'
import { careerMovesQuery } from './saveMovesQuery'

const LABEL: Record<CareerMoveType, string> = {
  TRANSFER_IN: 'Transfer',
  LOAN_IN: 'Kiralık',
  NEW_PLAYER: 'Yeni oyuncu',
  TRANSFER_OUT: 'Transfer',
  LOAN_OUT: 'Kiralık',
}
const INCOMING: CareerMoveType[] = ['TRANSFER_IN', 'LOAN_IN', 'NEW_PLAYER']

function MoveList({ title, moves, incoming }: { title: string; moves: CareerMove[]; incoming: boolean }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="min-w-0 flex-1">
      <h3 id={id} className="mb-1 font-display text-lg font-semibold">{title}</h3>
      {moves.length === 0 ? (
        <p className="text-sm text-ink-2">Yok.</p>
      ) : (
        <ul className="divide-y divide-[var(--glass-border)] text-sm">
          {moves.map((m) => (
            <li key={`${m.type}-${m.playerId}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2">
              <Chip tone={incoming ? 'good' : 'bad'}>{LABEL[m.type]}</Chip>
              <Link to={`/players/${m.playerId}`} className="font-semibold hover:underline">{m.name}</Link>
              {(m.position || m.overall !== undefined) && (
                <span className="text-xs text-ink-2">{[m.position, m.overall].filter((v) => v !== undefined && v !== null).join(' · ')}</span>
              )}
              {incoming ? m.fromClub && <span className="text-ink-2">{m.fromClub} →</span> : m.toClub && <span className="text-ink-2">→ {m.toClub}</span>}
              {m.sinceStart && <span className="text-xs text-muted">sezon başından</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Kayda göre hareketler: son içe aktarılan kariyer kaydı ile oyunun ana kaydı arasındaki fark (gelen/giden transfer, kiralık, oyunda üretilen
 * yeni oyuncu). Bedel bilinmez; elle girilen hareketler ayrı listede (MoveHistory).
 */
export function SaveMoves({ careerId }: { careerId: number }) {
  const moves = useQuery(careerMovesQuery(careerId))
  return (
    <Panel title="Kayda göre hareketler">
      <p className="mb-2 text-xs text-ink-2">Son içe aktarılan kaydın oyunun ana kaydına göre farkı. Bedel bilgisi yok.</p>
      {moves.isLoading ? (
        <Skeleton className="h-24" />
      ) : moves.isError ? (
        <ErrorState message="Hareketler yüklenemedi." onRetry={() => moves.refetch()} />
      ) : (moves.data ?? []).length === 0 ? (
        <EmptyState>Ana kayda göre kadroda değişiklik yok (ya da henüz kariyer kaydı içe aktarılmadı).</EmptyState>
      ) : (
        <div className="flex flex-col gap-4 min-[820px]:flex-row">
          <MoveList title={`Gelenler (${moves.data!.filter((m) => INCOMING.includes(m.type)).length})`} moves={moves.data!.filter((m) => INCOMING.includes(m.type))} incoming />
          <MoveList title={`Gidenler (${moves.data!.filter((m) => !INCOMING.includes(m.type)).length})`} moves={moves.data!.filter((m) => !INCOMING.includes(m.type))} incoming={false} />
        </div>
      )}
    </Panel>
  )
}
