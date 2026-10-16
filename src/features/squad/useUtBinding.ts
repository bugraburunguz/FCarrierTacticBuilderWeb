import { useQueries } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { carryOver, fromSummary, personKey, type UtCard } from '../../lib/utCard'
import { utCardStore } from '../../state/utCardStore'
import { DEFAULT_UT_FORMATION, DEFAULT_UT_SETUP, utSquadStore } from '../../state/utSquadStore'
import type { SquadBinding, SquadPatch, SquadState } from './types'

const HYDRATE_STALE_MS = 300_000

/** Katalog kartı kayıtta yalnız kimlik olarak durur (kopya değil): içerik her yüklemede katalogdan gelir (F12). */
function catalogRef(card: UtCard): UtCard {
  return { key: card.key, source: 'catalog', name: '', rating: 0, positions: [], playerId: card.playerId }
}

/** Kulüp/market kartı yakalama kitaplığından tazelenir; kitaplıkta yoksa kayıtlı kopya kalır. */
function fromLibrary(card: UtCard, library: UtCard[] | undefined): UtCard {
  return library?.find((c) => c.key === card.key) ?? card
}

/** UT bağlayıcısı: durum sayfada yerel, her değişimde utSquadStore'a kaydedilir; yenilemede kartlar kaynaklarından tazelenir. */
export function useUtBinding() {
  const saved = useMemo(() => utSquadStore.get(), [])
  const origin = useRef<'manual' | 'active-squad'>(saved?.origin ?? 'manual')
  const [state, setState] = useState<SquadState<UtCard>>(() => {
    const library = utCardStore.get()?.cards
    return {
      formationId: saved?.formationId ?? DEFAULT_UT_FORMATION,
      setup: saved?.setup ?? DEFAULT_UT_SETUP,
      roleOverride: saved?.roleOverride ?? {},
      tags: {},
      assigned: Object.fromEntries(Object.entries(saved?.picked ?? {}).map(([slotId, card]) => [slotId, card.source === 'catalog' ? card : fromLibrary(card, library)])),
    }
  })
  const patch = useCallback((change: SquadPatch<UtCard>) => setState((cur) => ({ ...cur, ...(typeof change === 'function' ? change(cur) : change) })), [])

  // Katalog kartları katalogdan tazelenir (F10'dan önceki kopyalarda yüz değerleri yok); kimlik aynı kalır, içerik güncellenir.
  const catalogSlots = Object.entries(state.assigned).filter(([, card]) => card.source === 'catalog' && card.playerId !== undefined)
  const fresh = useQueries({
    queries: catalogSlots.map(([, card]) => ({
      queryKey: ['ut-hydrate', card.playerId],
      queryFn: () => endpoints.player(card.playerId!),
      // Yalnız kimlik olarak kayıtlı (içeriksiz) ya da yüz değeri olmayan eski kopya tazelenir; tam kart için istek gitmez.
      enabled: card.name === '' || card.faceStats === undefined,
      staleTime: HYDRATE_STALE_MS,
      retry: false,
    })),
  })
  const freshKey = fresh.map((q) => q.dataUpdatedAt).join(',')
  useEffect(() => {
    const updates: [string, UtCard][] = []
    catalogSlots.forEach(([slotId, card], i) => {
      const summary = fresh[i]?.data?.summary
      if (summary && (card.name === '' || card.faceStats === undefined)) {
        updates.push([slotId, { ...fromSummary(summary), price: card.price }])
      }
    })
    if (updates.length > 0) {
      patch((cur) => ({ assigned: { ...cur.assigned, ...Object.fromEntries(updates.filter(([slotId, c]) => cur.assigned[slotId]?.playerId === c.playerId)) } }))
    }
    // yalnız yeni veri geldiğinde çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey])

  // Henüz kullanıcı bir şey yapmadıysa boş kadro kaydedilmez (aktif kadro otomatik yüklenebilsin).
  useEffect(() => {
    if (!saved && Object.keys(state.assigned).length === 0) {
      return
    }
    const picked = Object.fromEntries(Object.entries(state.assigned).map(([slotId, card]) => [slotId, card.source === 'catalog' && card.playerId !== undefined ? catalogRef(card) : card]))
    utSquadStore.set({ formationId: state.formationId ?? DEFAULT_UT_FORMATION, setup: state.setup ?? DEFAULT_UT_SETUP, picked, roleOverride: state.roleOverride, origin: origin.current })
  }, [saved, state])

  const markActiveSquad = useCallback(() => {
    origin.current = 'active-squad'
  }, [])

  const binding: SquadBinding<UtCard> = useMemo(
    () => ({
      state,
      patch,
      carry: carryOver,
      keyOf: personKey,
      faceOf: (card) => card,
      defaultFormation: DEFAULT_UT_FORMATION,
      keepAssignedOnImport: false,
    }),
    [state, patch],
  )
  return { binding, saved, markActiveSquad }
}
