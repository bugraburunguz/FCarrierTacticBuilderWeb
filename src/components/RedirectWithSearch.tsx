import { Navigate, useLocation } from 'react-router-dom'

/** Taşınan rota (KARIYER-UX 15 §3): eski adres yeni adrese sorgu dizgisi ve hash'le birlikte, geçmişe girmeden yönlenir. */
export function RedirectWithSearch({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}
