import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { endpoints } from '../../../api/endpoints'
import type { CareerPlayer } from '../../../api/types'
import { cardPlayerOfSummary } from '../../../lib/cardPlayer'
import { toneOf } from '../../../lib/fitTone'
import { FIT_STATE, PickList, type PickRow } from './PickList'

const MAX_FIT_QUERIES = 40
const SEARCH_DEBOUNCE_MS = 150

interface Props {
  position: string
  roleId: string
  tags: string[]
  /** Yalnız bu mevkide oynayabilen (ana + alternatif) kadro oyuncuları. */
  candidates: CareerPlayer[]
  currentPlayerId?: number
  onPick: (playerId: number) => void
  onClear: () => void
}

/** Kariyer oyuncu seçici: UT ile aynı PickList; veri kaynağı kadro, uyum % sahadaki rozetle aynı uçtan (fitRole). */
export function CareerPickList({ position, roleId, tags, candidates, currentPlayerId, onPick, onClear }: Props) {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim().toLowerCase()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  const filtered = useMemo(() => candidates.filter((c) => c.player.name.toLowerCase().includes(query)).sort((a, b) => b.player.overall - a.player.overall), [candidates, query])
  const scored = filtered.slice(0, MAX_FIT_QUERIES)
  const fits = useQueries({
    queries: scored.map((c) => ({
      queryKey: ['slot-fit', c.player.id, roleId, position, tags.join(',')],
      queryFn: () => endpoints.fitRole({ playerId: c.player.id, roleId, position, tags }),
      staleTime: 300_000,
      retry: false,
    })),
  })
  const fitById = new Map(scored.map((c, i) => [c.player.id, fits[i]?.data?.roleFit]))

  const rows: PickRow[] = filtered.map((c) => {
    const fit = fitById.get(c.player.id)
    return {
      key: String(c.player.id),
      name: c.player.name,
      ovr: c.player.overall,
      positions: c.player.positions,
      sub: c.player.club,
      fitPct: fit ? Math.round(fit.score) : undefined,
      fitState: fit ? FIT_STATE[toneOf(fit.badge)] : undefined,
      note: c.form !== undefined ? `form ${c.form}` : undefined,
      current: c.player.id === currentPlayerId,
      card: cardPlayerOfSummary(c.player, position),
      onPick: () => onPick(c.player.id),
    }
  })
  return <PickList rows={rows} search={term} onSearch={setTerm} onClear={currentPlayerId !== undefined ? onClear : undefined} emptyText="Bu mevkide oynayabilen oyuncu yok." />
}
