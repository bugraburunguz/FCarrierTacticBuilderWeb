import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { endpoints } from '../api/endpoints'
import { tokens } from '../api/tokens'
import type { Me } from '../api/types'

interface AuthState {
  authenticated: boolean
  me: Me | undefined
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<unknown>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const authenticated = useSyncExternalStore(tokens.subscribe, () => tokens.authenticated)
  const meQuery = useQuery({ queryKey: ['me'], queryFn: endpoints.me, enabled: authenticated, retry: false })

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await endpoints.login(email, password)
      tokens.set(response.accessToken, response.refreshToken)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [queryClient],
  )

  const register = useCallback(
    async (email: string, password: string) => {
      const response = await endpoints.register(email, password)
      tokens.set(response.accessToken, response.refreshToken)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    const refresh = tokens.refresh
    tokens.clear()
    queryClient.clear()
    if (refresh) {
      try {
        await endpoints.logout(refresh)
      } catch {
        /* token already invalid server-side */
      }
    }
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({
      authenticated,
      me: authenticated ? meQuery.data : undefined,
      loading: authenticated && meQuery.isLoading,
      login,
      register,
      logout,
      refreshMe: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
    }),
    [authenticated, meQuery.data, meQuery.isLoading, login, register, logout, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
