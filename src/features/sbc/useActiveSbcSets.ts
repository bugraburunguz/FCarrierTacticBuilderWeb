import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { KbItem } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { parseReward } from './sbcList'

const STALE_MS = 120_000
/** /players/assets üst sınırı (backend MAX_ASSET_IDS). */
const MAX_ASSET_NAMES = 100
const MINUTE = 60_000

/** Geri sayım dakikada bir güncellenir (aria-live yok). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/**
 * Aktif SBC setleri ve kartlarının çizim verisi (V3-07a: SBC listesi ve ana sayfa ortak): bilgi tabanı setleri, ödül kartları (ut_item, resource),
 * EA verisi gelen ödül kartlarının adı (katalog, assetId) ve oylar (oturumlu).
 */
export function useActiveSbcSets() {
  const { authenticated } = useAuth()
  const sets = useQuery({ queryKey: ['kb-sbc', 'active'], queryFn: () => endpoints.kbSbc({ active: true }), staleTime: STALE_MS })
  const all = useMemo(() => sets.data ?? [], [sets.data])
  const resources = useMemo(() => [...new Set(all.flatMap((s) => parseReward(s.reward).itemResourceIds))].sort((a, b) => a - b), [all])
  const items = useQuery({
    queryKey: ['kb-items-resource', resources],
    queryFn: () => endpoints.kbItems({ resource: resources, limit: Math.min(resources.length, 100) }),
    enabled: resources.length > 0,
    staleTime: STALE_MS,
  })
  const itemMap = useMemo(() => new Map<number, KbItem>((items.data ?? []).map((i) => [i.eaResourceId, i])), [items.data])
  // V3-05c-c: EA verisi gelen ödül kartlarının adı katalogdan (assetId), tek istekte.
  const assets = useMemo(() => [...new Set(all.flatMap((s) => parseReward(s.reward).eaItems.map((i) => i.assetId)).filter((a): a is number => a !== undefined))].sort((a, b) => a - b), [all])
  const names = useQuery({
    queryKey: ['player-asset-names', assets],
    queryFn: () => endpoints.playerAssetNames(assets.slice(0, MAX_ASSET_NAMES)),
    enabled: assets.length > 0,
    staleTime: STALE_MS,
  })
  const nameMap = useMemo(() => new Map<number, string>((names.data ?? []).map((n) => [n.assetId, n.name])), [names.data])
  const votes = useQuery({ queryKey: ['sbc-votes'], queryFn: endpoints.sbcVotes, enabled: authenticated, staleTime: STALE_MS })
  const voteMap = useMemo(() => new Map((votes.data?.sets ?? []).map((v) => [v.setId, v])), [votes.data])
  return { sets, all, itemMap, nameMap, voteMap }
}
