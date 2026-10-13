import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { carryOver, personKey, type UtCard } from '../../lib/utCard'
import { DEFAULT_UT_FORMATION, DEFAULT_UT_SETUP, utSquadStore } from '../../state/utSquadStore'
import type { SquadBinding, SquadPatch, SquadState } from './types'

/** UT bağlayıcısı: durum sayfada yerel (kart nesneleri), her değişimde utSquadStore'a kaydedilir; yenilemede geri gelir. */
export function useUtBinding() {
  const saved = useMemo(() => utSquadStore.get(), [])
  const origin = useRef<'manual' | 'active-squad'>(saved?.origin ?? 'manual')
  const [state, setState] = useState<SquadState<UtCard>>({
    formationId: saved?.formationId ?? DEFAULT_UT_FORMATION,
    setup: saved?.setup ?? DEFAULT_UT_SETUP,
    roleOverride: saved?.roleOverride ?? {},
    tags: {},
    assigned: saved?.picked ?? {},
  })
  const patch = useCallback((change: SquadPatch<UtCard>) => setState((cur) => ({ ...cur, ...(typeof change === 'function' ? change(cur) : change) })), [])

  // Henüz kullanıcı bir şey yapmadıysa boş kadro kaydedilmez (aktif kadro otomatik yüklenebilsin).
  useEffect(() => {
    if (!saved && Object.keys(state.assigned).length === 0) {
      return
    }
    utSquadStore.set({ formationId: state.formationId ?? DEFAULT_UT_FORMATION, setup: state.setup ?? DEFAULT_UT_SETUP, picked: state.assigned, roleOverride: state.roleOverride, origin: origin.current })
  }, [saved, state])

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
  const markActiveSquad = useCallback(() => {
    origin.current = 'active-squad'
  }, [])
  return { binding, saved, markActiveSquad }
}
