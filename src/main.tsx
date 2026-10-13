import './state/migrations'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './auth/AuthContext'
import { api } from './api/client'
import { hydrateBigStores } from './state/bigStore'
import { hydrateRules } from './state/rulesStore'
import './index.css'
import { bootDesign } from './design/boot'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
})

bootDesign()
void hydrateRules(() => api.get('/ut/rules'))
void hydrateBigStores().finally(() =>
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
  ),
)
