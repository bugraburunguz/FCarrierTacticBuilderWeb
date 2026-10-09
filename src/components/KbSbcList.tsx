import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { KbSbcSet } from '../api/types'
import { SbcVote, useSbcVotes } from './SbcVote'
import { Card, EmptyState, Pill, Skeleton } from './ui'

/** Kalan süreyi "3g 4s" ya da "5s 12dk" biçiminde verir; geçmişse undefined. */
export function timeLeft(endsAt?: string, now: number = Date.now()): { text: string; urgent: boolean } | undefined {
  if (!endsAt) {
    return undefined
  }
  const ms = new Date(endsAt).getTime() - now
  if (ms <= 0) {
    return undefined
  }
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const text = days > 0 ? `${days}g ${hours}s` : hours > 0 ? `${hours}s ${minutes % 60}dk` : `${minutes}dk`
  return { text, urgent: ms < 24 * 3_600_000 }
}

type Sort = 'ends' | 'new' | 'name'

/**
 * Herkese açık SBC listesi (DATA-08): extension kurmadan görünür. Kategori sekmeleri, sıralama, kalan süre, topluluk oyu.
 * Veri katkıcı konsensüsü ya da admin girişiyle gelir; doğrulanmamış (PENDING) kayıtlar etiketlenir.
 */
export function KbSbcList() {
  const sets = useQuery({ queryKey: ['kb-sbc'], queryFn: () => endpoints.kbSbc({ active: true }), staleTime: 60_000 })
  const votes = useSbcVotes()
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<Sort>('ends')
  const data = useMemo(() => sets.data ?? [], [sets.data])
  const categories = useMemo(() => [...new Set(data.map((s) => s.category))].sort(), [data])
  const rows = useMemo(() => {
    const filtered = category === 'all' ? data : data.filter((s) => s.category === category)
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name, 'tr') : sort === 'new' ? b.id - a.id : (a.endsAt ?? '9').localeCompare(b.endsAt ?? '9'),
    )
  }, [data, category, sort])

  if (sets.isLoading) {
    return (
      <Card title="Güncel SBC'ler">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}
        </div>
      </Card>
    )
  }
  if (data.length === 0) {
    return null
  }

  return (
    <Card title={`Güncel SBC'ler (${rows.length})`} actions={
      <label className="flex items-center gap-1.5 text-xs text-muted">
        Sırala
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink">
          <option value="ends">Bitişe göre</option>
          <option value="new">En yeni</option>
          <option value="name">Ada göre</option>
        </select>
      </label>
    }>
      <div role="tablist" aria-label="Kategori" className="mb-3 flex flex-wrap gap-1.5">
        {['all', ...categories].map((c) => (
          <button key={c} type="button" role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
            className={`rounded-md px-2.5 py-1 font-display text-sm font-semibold uppercase tracking-wide ${category === c ? 'bg-accent-bg text-on-accent' : 'bg-surface-2 text-ink hover:bg-line'}`}>
            {c === 'all' ? 'Tümü' : c}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState>Bu kategoride güncel SBC yok.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((s) => <KbSbcRow key={s.id} set={s} votes={votes.get(s.id)} />)}
        </ul>
      )}
    </Card>
  )
}

function KbSbcRow({ set, votes }: { set: KbSbcSet; votes?: import('../api/types').SbcSetVotes }) {
  const left = timeLeft(set.endsAt)
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <Link to={`/ut/sbc/${set.id}`} className="font-semibold underline decoration-dotted underline-offset-2 hover:text-accent">{set.name}</Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Pill>{set.category}</Pill>
          <span>{set.challengeCount} adım</span>
          {set.repeatable !== undefined && set.repeatable !== null && <Pill tone="sky">tekrarlanabilir</Pill>}
          {set.status === 'PENDING' && <Pill tone="amber">doğrulanmamış</Pill>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {left && <span className={`num text-xs font-medium ${left.urgent ? 'text-danger' : 'text-muted'}`}>{left.urgent ? 'Son ' : ''}{left.text}</span>}
        <SbcVote setId={set.id} votes={votes} />
      </div>
    </li>
  )
}
