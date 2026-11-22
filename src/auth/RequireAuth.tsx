import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useAuth } from './AuthContext'

interface RequireAuthProps {
  children: ReactNode
  /** Premium/kredi bilgisini ilk karede gösteren sayfalar /me gelene kadar bekler. */
  waitForMe?: boolean
}

export function RequireAuth({ children, waitForMe = false }: RequireAuthProps) {
  const { authenticated, loading } = useAuth()
  const location = useLocation()
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (waitForMe && loading) {
    return <Spinner />
  }
  return <>{children}</>
}
