import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { endpoints } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { careerStore, useActiveCareerId } from '../state/careerStore'
import { modeForPath, modeStore } from '../state/modeStore'

/** Kabuk (Layout / v3 AppShell) ortak davranışı: seçili kariyer geçersizse temizle, modu URL önekinden çıkar (WEB-BUG-07). */
export function useShellEffects(pathname: string) {
  const { authenticated } = useAuth()
  const activeCareer = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  useEffect(() => {
    // Seçili kariyer kullanıcının listesinde yoksa (silinmiş/eski/yabancı id) temizle: 404 yerine model verisi.
    if (authenticated && careers.data && activeCareer !== undefined && !careers.data.some((c) => c.id === activeCareer)) {
      careerStore.set(careers.data[0]?.id)
    }
  }, [authenticated, careers.data, activeCareer])
  useEffect(() => {
    const forced = modeForPath(pathname)
    if (forced && modeStore.get() !== forced) {
      modeStore.set(forced)
    }
  }, [pathname])
}
