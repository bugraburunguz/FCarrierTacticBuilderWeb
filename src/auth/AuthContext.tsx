import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { endpoints } from '../api/endpoints'
import { tokens } from '../api/tokens'
import type { Me } from '../api/types'

interface AuthState {
  authenticated: boolean
  me: Me | undefined
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  /** privacyVersion: kayıtta okunduğu onaylanan aydınlatma metni sürümü (sunucu zorunlu tutar). */
  register: (email: string, password: string, privacyVersion?: number) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<unknown>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const authenticated = useSyncExternalStore(tokens.subscribe, () => tokens.authenticated)
  // Geçici hız sınırı (429) profil yüklemesini kalıcı olarak düşürmesin: 3 kez, artan aralıkla yeniden dener; diğer hatalarda denemez.
  const meQuery = useQuery({
    queryKey: ['me'], queryFn: endpoints.me, enabled: authenticated,
    retry: (count, error) => error instanceof ApiError && error.status === 429 && count < 3,
    retryDelay: (count) => 1500 * (count + 1),
  })

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await endpoints.login(email, password)
      tokens.set(response.accessToken, response.refreshToken)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [queryClient],
  )

  const register = useCallback(
    async (email: string, password: string, privacyVersion?: number) => {
      const response = await endpoints.register(email, password, privacyVersion)
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
