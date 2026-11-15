import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { homeFor } from '../../lib/navConfig'
import { useMode } from '../../state/modeStore'

const HomePage = lazy(() => import('./HomePage').then((m) => ({ default: m.HomePage })))

export function HomeRoute() {
  const mode = useMode()
  const { authenticated } = useAuth()
  const target = homeFor(mode, authenticated)
  if (target !== '/') {
    return <Navigate to={target} replace />
  }
  return <HomePage />
}
