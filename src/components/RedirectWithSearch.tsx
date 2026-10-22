import { Navigate, useLocation } from 'react-router-dom'
import { legacySquadTarget } from '../features/careerSquad/careerSquadRules'

/** Taşınan rota (KARIYER-UX 15 §3): eski adres yeni adrese sorgu dizgisi ve hash'le birlikte, geçmişe girmeden yönlenir. */
export function RedirectWithSearch({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}

/** Eski /squad (FAZ 3): sekme adları eşlenir, kariyer sekmesi Masa › Ayarlar'a gider (careerSquadRules.legacySquadTarget). */
export function LegacySquadRedirect() {
  const { search, hash } = useLocation()
  return <Navigate to={`${legacySquadTarget(search)}${hash}`} replace />
}
