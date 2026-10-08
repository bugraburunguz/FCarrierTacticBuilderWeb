import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { ComparePage } from './pages/ComparePage'
import { WizardPage } from './pages/WizardPage'
import { WonderkidsPage } from './pages/WonderkidsPage'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/ImportPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { PlayerDetailPage } from './pages/PlayerDetailPage'
import { PlayersPage } from './pages/PlayersPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecommendPage } from './pages/RecommendPage'
import { SquadBuilderPage } from './pages/SquadBuilderPage'
import { ScoutingPage } from './pages/ScoutingPage'
import { SquadPage } from './pages/SquadPage'
import { TeamsPage } from './pages/TeamsPage'
import { UtMetaPage } from './pages/UtMetaPage'
import { UtImportPage } from './pages/UtImportPage'
import { UtObjectivesPage } from './pages/UtObjectivesPage'
import { UtSbcPage } from './pages/UtSbcPage'
import { UtSquadPage } from './pages/UtSquadPage'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth()
  const location = useLocation()
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (loading) {
    return <Spinner />
  }
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="players/:id" element={<PlayerDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="wonderkids" element={<WonderkidsPage />} />
        <Route path="tactics/builder" element={<Navigate to="/squad/builder" replace />} />
        <Route path="tactics/wizard" element={<WizardPage />} />
        <Route path="squad" element={<RequireAuth><SquadPage /></RequireAuth>} />
        <Route path="squad/builder" element={<SquadBuilderPage />} />
        <Route path="scouting" element={<RequireAuth><ScoutingPage /></RequireAuth>} />
        <Route path="fit" element={<Navigate to="/tactics/builder" replace />} />
        <Route path="recommend" element={<RequireAuth><RecommendPage /></RequireAuth>} />
        <Route path="career/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
        <Route path="teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
        <Route path="ut/squad" element={<UtSquadPage />} />
        <Route path="ut/meta" element={<UtMetaPage />} />
        <Route path="ut/sbc" element={<UtSbcPage />} />
        <Route path="ut/objectives" element={<UtObjectivesPage />} />
        <Route path="ut/import" element={<UtImportPage />} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="subscription" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
