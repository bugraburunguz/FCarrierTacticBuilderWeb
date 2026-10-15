import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useMode } from './state/modeStore'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { CaptureOnly } from './components/CaptureOnly'
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
const SquadBuilderPage = lazy(() => import('./pages/SquadBuilderPage').then((m) => ({ default: m.SquadBuilderPage })))
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
const ReplicasPage = lazy(() => import('./features/replicas/ReplicasPage').then((m) => ({ default: m.ReplicasPage })))
const ReplicaDetailPage = lazy(() => import('./features/replicas/ReplicaDetailPage').then((m) => ({ default: m.ReplicaDetailPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const CardDatabasePage = lazy(() => import('./features/cards/CardDatabasePage').then((m) => ({ default: m.CardDatabasePage })))
const UtPlayerPage = lazy(() => import('./features/cards/UtPlayerPage').then((m) => ({ default: m.UtPlayerPage })))
const SbcListPage = lazy(() => import('./features/sbc/SbcListPage').then((m) => ({ default: m.SbcListPage })))
const UtSquadPage = lazy(() => import('./pages/UtSquadPage').then((m) => ({ default: m.UtSquadPage })))

/** /players: UT modunda kart veritabanı (V3-05a), kariyer modunda mevcut oyuncu araması. */
function PlayersRoute() {
  return useMode() === 'ut' ? <CardDatabasePage /> : <PlayersPage />
}

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
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="players" element={<PlayersRoute />} />
        <Route path="players/:id" element={<PlayerDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="wonderkids" element={<WonderkidsPage />} />
        <Route path="tactics/builder" element={<Navigate to="/squad/builder" replace />} />
        <Route path="tactics/wizard" element={<WizardPage />} />
        <Route path="squad" element={<RequireAuth><SquadPage /></RequireAuth>} />
        <Route path="squad/builder" element={<SquadBuilderPage />} />
        <Route path="replicas" element={<ReplicasPage />} />
        <Route path="replicas/:id" element={<ReplicaDetailPage />} />
        <Route path="scouting" element={<Navigate to="/career/transfer" replace />} />
        <Route path="fit" element={<Navigate to="/tactics/builder" replace />} />
        <Route path="recommend" element={<Navigate to="/career/transfer" replace />} />
        <Route path="career/import" element={<RequireAuth><ImportPage /></RequireAuth>} />
        <Route path="career/desk" element={<RequireAuth><CareerDeskPage /></RequireAuth>} />
        <Route path="career/new" element={<RequireAuth><CareerNewPage /></RequireAuth>} />
        <Route path="career/transfer" element={<RequireAuth><CareerTransferPage /></RequireAuth>} />
        <Route path="career/growth" element={<RequireAuth><CareerGrowthPage /></RequireAuth>} />
        <Route path="teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
        <Route path="ut/players/:assetId" element={<UtPlayerPage />} />
        <Route path="ut/squad" element={<UtSquadPage />} />
        <Route path="ut/meta" element={<UtMetaPage />} />
        {/* V3-06a: tek veri kaynağı Web App yakalaması olan UT sayfaları; yakalama bayrağı kapalıyken tek kısa not (kod duruyor).
            v3: Katalog şablonlu SBC listesi; v2 sayfası (UtSbcPage/KbSbcList) dokunulmadan kalır. */}
        <Route path="ut/sbc" element={<CaptureOnly title="SBC çözücü">{isV3() ? <SbcListPage /> : <UtSbcPage />}</CaptureOnly>} />
        <Route path="ut/sbc/:setId/:challengeId" element={<CaptureOnly title="SBC çözücü"><UtSbcChallengePage /></CaptureOnly>} />
        <Route path="ut/sbc/:setId" element={<CaptureOnly title="SBC çözücü"><UtSbcChallengePage /></CaptureOnly>} />
        <Route path="ut/objectives" element={<CaptureOnly title="Objective planı"><UtObjectivesPage /></CaptureOnly>} />
        <Route path="ut/club" element={<CaptureOnly title="Kadrom"><UtClubPage /></CaptureOnly>} />
        <Route path="ut/import" element={<UtImportPage />} />
        <Route path="ut/evo" element={<CaptureOnly title="Evolution"><UtEvolutionsPage /></CaptureOnly>} />
        <Route path="admin/ut" element={<AdminUtPage />} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="subscription" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
