import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, WeaponState } from '../../api/types'
import { BADGE_EMOJI } from '../../lib/format'
import { ovrBand } from '../../lib/squadBuilder'
import { Modal } from '../Modal'

const FIT_CANDIDATES = 24
const SEARCH_DEBOUNCE_MS = 150

interface Props {
  position: string
  roleId: string
  tags: string[]
  candidates: CareerPlayer[]
  currentPlayerId?: number
  onPick: (playerId: number | null) => void
  onClose: () => void
}

/** Slota mevki-uyumlu oyuncular; en yüksek OVR'lı adaylar için rol uyumu hesaplanır ve liste uyuma göre sıralanır. */
export function PlayerSelectModal({ position, roleId, tags, candidates, currentPlayerId, onPick, onClose }: Props) {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim().toLowerCase()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])

  const filtered = useMemo(
    () => candidates.filter((c) => c.player.name.toLowerCase().includes(query)).sort((a, b) => b.player.overall - a.player.overall),
    [candidates, query],
  )
  const scored = filtered.slice(0, FIT_CANDIDATES)
  const fits = useQueries({
    queries: scored.map((c) => ({
      queryKey: ['slot-fit', c.player.id, roleId, position, tags.join(',')],
      queryFn: () => endpoints.fitRole({ playerId: c.player.id, roleId, position, tags }),
      staleTime: 300_000,
      retry: false,
    })),
  })
  const fitById = new Map<number, { pct: number; band: WeaponState }>()
  scored.forEach((c, i) => {
    const fit = fits[i]?.data?.roleFit
    if (fit) {
      fitById.set(c.player.id, { pct: Math.round(fit.score), band: fit.badge })
    }
  })
  const sorted = [...filtered].sort((a, b) => (fitById.get(b.player.id)?.pct ?? -1) - (fitById.get(a.player.id)?.pct ?? -1) || b.player.overall - a.player.overall)

  return (
    <Modal title={`${position} — Oyuncu seç`} hint="Bu slota uygun oyuncular (rol uyumuna göre sıralı)" onClose={onClose}>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Ara…"
        aria-label="Oyuncu ara"
        className="mb-2.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
      />
      {currentPlayerId !== undefined && (
        <button type="button" onClick={() => onPick(null)} className="mb-2 w-full rounded-lg border border-slate-700 py-1.5 text-xs text-slate-300 hover:border-rose-400 hover:text-rose-300">
          Slotu boşalt
        </button>
      )}
      <ul>
        {sorted.map((c) => {
          const fit = fitById.get(c.player.id)
          return (
            <li key={c.player.id}>
              <button
                type="button"
                onClick={() => onPick(c.player.id)}
                aria-current={c.player.id === currentPlayerId}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-2 py-2 text-left hover:border-slate-600 hover:bg-slate-800 ${c.player.id === currentPlayerId ? 'border-emerald-500' : 'border-transparent'}`}
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-xs font-extrabold text-black/80" style={{ background: ovrBand(c.player.overall) }}>
                  {c.player.overall}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{c.player.name}</span>
                {fit && (
                  <span className="text-[11px] tabular-nums text-slate-300">
                    {BADGE_EMOJI[fit.band]} %{fit.pct}
                  </span>
                )}
                <span className="text-[11px] text-slate-400">{c.player.positions.slice(0, 3).join('/')}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {sorted.length === 0 && <p className="p-2 text-xs text-slate-400">Uygun oyuncu yok</p>}
    </Modal>
  )
}
