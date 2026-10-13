import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { lazy, Suspense, type ReactNode } from 'react'
import { AppShell } from './design/components/AppShell'
import { isV3 } from './design/uiVersion'

// Rota başına lazy chunk (11 §8 Q10): ilk JS yalnız kabuk + açılan sayfa.
const CareerDeskPage = lazy(() => import('./pages/CareerDeskPage').then((m) => ({ default: m.CareerDeskPage })))
const CareerGrowthPage = lazy(() => import('./pages/CareerGrowthPage').then((m) => ({ default: m.CareerGrowthPage })))
const CareerNewPage = lazy(() => import('./pages/CareerNewPage').then((m) => ({ default: m.CareerNewPage })))
const CareerTransferPage = lazy(() => import('./pages/CareerTransferPage').then((m) => ({ default: m.CareerTransferPage })))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })))
const WizardPage = lazy(() => import('./pages/WizardPage').then((m) => ({ default: m.WizardPage })))
const WonderkidsPage = lazy(() => import('./pages/WonderkidsPage').then((m) => ({ default: m.WonderkidsPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const ImportPage = lazy(() => import('./pages/ImportPage').then((m) => ({ default: m.ImportPage })))
const LoginPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.RegisterPage })))
const PlayerDetailPage = lazy(() => import('./pages/PlayerDetailPage').then((m) => ({ default: m.PlayerDetailPage })))
const PlayersPage = lazy(() => import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const RecommendPage = lazy(() => import('./pages/RecommendPage').then((m) => ({ default: m.RecommendPage })))
const SquadBuilderPage = lazy(() => import('./pages/SquadBuilderPage').then((m) => ({ default: m.SquadBuilderPage })))
const ScoutingPage = lazy(() => import('./pages/ScoutingPage').then((m) => ({ default: m.ScoutingPage })))
const SquadPage = lazy(() => import('./pages/SquadPage').then((m) => ({ default: m.SquadPage })))
const TeamsPage = lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })))
const UtMetaPage = lazy(() => import('./pages/UtMetaPage').then((m) => ({ default: m.UtMetaPage })))
const UtClubPage = lazy(() => import('./pages/UtClubPage').then((m) => ({ default: m.UtClubPage })))
const AdminUtPage = lazy(() => import('./pages/AdminUtPage').then((m) => ({ default: m.AdminUtPage })))
const UtEvolutionsPage = lazy(() => import('./pages/UtEvolutionsPage').then((m) => ({ default: m.UtEvolutionsPage })))
const UtImportPage = lazy(() => import('./pages/UtImportPage').then((m) => ({ default: m.UtImportPage })))
const UtObjectivesPage = lazy(() => import('./pages/UtObjectivesPage').then((m) => ({ default: m.UtObjectivesPage })))
const UtSbcPage = lazy(() => import('./pages/UtSbcPage').then((m) => ({ default: m.UtSbcPage })))
const UtSbcChallengePage = lazy(() => import('./pages/UtSbcChallengePage').then((m) => ({ default: m.UtSbcChallengePage })))
const UtSquadPage = lazy(() => import('./pages/UtSquadPage').then((m) => ({ default: m.UtSquadPage })))

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
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route element={isV3() ? <AppShell /> : <Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
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
        <Route path="career/desk" element={<RequireAuth><CareerDeskPage /></RequireAuth>} />
        <Route path="career/new" element={<RequireAuth><CareerNewPage /></RequireAuth>} />
        <Route path="career/transfer" element={<RequireAuth><CareerTransferPage /></RequireAuth>} />
        <Route path="career/growth" element={<RequireAuth><CareerGrowthPage /></RequireAuth>} />
        <Route path="teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
        <Route path="ut/squad" element={<UtSquadPage />} />
        <Route path="ut/meta" element={<UtMetaPage />} />
        <Route path="ut/sbc" element={<UtSbcPage />} />
        <Route path="ut/sbc/:setId/:challengeId" element={<UtSbcChallengePage />} />
        <Route path="ut/sbc/:setId" element={<UtSbcChallengePage />} />
        <Route path="ut/objectives" element={<UtObjectivesPage />} />
        <Route path="ut/club" element={<UtClubPage />} />
        <Route path="ut/import" element={<UtImportPage />} />
        <Route path="ut/evo" element={<UtEvolutionsPage />} />
        <Route path="admin/ut" element={<AdminUtPage />} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="subscription" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
