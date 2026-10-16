import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useMode } from './state/modeStore'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { CaptureOnly } from './components/CaptureOnly'
import { lazy, Suspense, type ReactNode } from 'react'
import { AppShell } from './design/components/AppShell'
import { isV3 } from './design/uiVersion'
import { useActiveCareerId } from './state/careerStore'
import { playerDetailView, playersView } from './features/careerPlayers/playersView'

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
const SbcSolvePage = lazy(() => import('./features/sbc/SbcSolvePage').then((m) => ({ default: m.SbcSolvePage })))
const UtSbcChallengePage = lazy(() => import('./pages/UtSbcChallengePage').then((m) => ({ default: m.UtSbcChallengePage })))
const ReplicasPage = lazy(() => import('./features/replicas/ReplicasPage').then((m) => ({ default: m.ReplicasPage })))
const ReplicaDetailPage = lazy(() => import('./features/replicas/ReplicaDetailPage').then((m) => ({ default: m.ReplicaDetailPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const CardDatabasePage = lazy(() => import('./features/cards/CardDatabasePage').then((m) => ({ default: m.CardDatabasePage })))
const CareerPlayersPage = lazy(() => import('./features/careerPlayers/CareerPlayersPage').then((m) => ({ default: m.CareerPlayersPage })))
const HomeV3 = lazy(() => import('./features/home/HomePage').then((m) => ({ default: m.HomePage })))
const LoginV3 = lazy(() => import('./features/account/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterV3 = lazy(() => import('./features/account/AuthPages').then((m) => ({ default: m.RegisterPage })))
const VerifyEmailV3 = lazy(() => import('./features/account/AuthPages').then((m) => ({ default: m.VerifyEmailPage })))
const PrivacyPage = lazy(() => import('./features/account/AuthPages').then((m) => ({ default: m.PrivacyPage })))
const ProfileV3 = lazy(() => import('./features/account/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const CareerImportPage = lazy(() => import('./features/import/CareerImportPage').then((m) => ({ default: m.CareerImportPage })))
const NewCareerPage = lazy(() => import('./features/career/NewCareerPage').then((m) => ({ default: m.NewCareerPage })))
const GrowthPage = lazy(() => import('./features/growth/GrowthPage').then((m) => ({ default: m.GrowthPage })))
const DeskPage = lazy(() => import('./features/desk/DeskPage').then((m) => ({ default: m.DeskPage })))
const TransferCenterPage = lazy(() => import('./features/transfer/TransferCenterPage').then((m) => ({ default: m.TransferCenterPage })))
const CareerPlayerPage = lazy(() => import('./features/player/CareerPlayerPage').then((m) => ({ default: m.CareerPlayerPage })))
const UtPlayerPage = lazy(() => import('./features/cards/UtPlayerPage').then((m) => ({ default: m.UtPlayerPage })))
const SbcListPage = lazy(() => import('./features/sbc/SbcListPage').then((m) => ({ default: m.SbcListPage })))
const UtSquadPage = lazy(() => import('./pages/UtSquadPage').then((m) => ({ default: m.UtSquadPage })))

/** /players: UT modunda kart veritabanı (V3-05a); kariyer modunda seçili kariyerin listesi (V3-06a) ya da mevcut oyuncu araması. */
function PlayersRoute() {
  const mode = useMode()
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const view = playersView({ mode, v3: isV3(), authenticated, careerId })
  if (view === 'cards') {
    return <CardDatabasePage />
  }
  return view === 'career' && careerId !== undefined ? <CareerPlayersPage key={careerId} careerId={careerId} /> : <PlayersPage />
}

/** /players/:id: kariyer modunda v3 + oturum + seçili kariyer → kariyer oyuncu sayfası (V3-06b); aksi halde mevcut sayfa (v2 dahil). */
function PlayerDetailRoute() {
  const mode = useMode()
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  return playerDetailView({ mode, v3: isV3(), authenticated, careerId }) === 'career' && careerId !== undefined
    ? <CareerPlayerPage key={careerId} careerId={careerId} />
    : <PlayerDetailPage />
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
        {/* V3-07a: v3'te ana sayfa, hesap ekranları, içe aktarma, yeni kariyer ve profil yeni; v2 sayfaları v2 için kalır. */}
        <Route index element={isV3() ? <HomeV3 /> : <HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="login" element={isV3() ? <LoginV3 /> : <LoginPage />} />
        <Route path="register" element={isV3() ? <RegisterV3 /> : <RegisterPage />} />
        <Route path="verify-email" element={isV3() ? <VerifyEmailV3 /> : <VerifyEmailPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="players" element={<PlayersRoute />} />
        <Route path="players/:id" element={<PlayerDetailRoute />} />
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
        <Route path="career/import" element={<RequireAuth>{isV3() ? <CareerImportPage /> : <ImportPage />}</RequireAuth>} />
        {/* V3-06d: v3'te Kariyer Masası (yalnız v3, Ayarlar sekmesi); v2 sayfası v2 için kalır. */}
        <Route path="career/desk" element={<RequireAuth>{isV3() ? <DeskPage /> : <CareerDeskPage />}</RequireAuth>} />
        <Route path="career/new" element={<RequireAuth>{isV3() ? <NewCareerPage /> : <CareerNewPage />}</RequireAuth>} />
        {/* V3-06c: v3'te Transfer Merkezi (yalnız v3 uçları); v2 sayfası v2 için kalır. */}
        <Route path="career/transfer" element={<RequireAuth>{isV3() ? <TransferCenterPage /> : <CareerTransferPage />}</RequireAuth>} />
        {/* V3-06e: v3'te Gelişim (grafik, yalnız mevcut uçlar); v2 sayfası v2 için kalır. */}
        <Route path="career/growth" element={<RequireAuth>{isV3() ? <GrowthPage /> : <CareerGrowthPage />}</RequireAuth>} />
        <Route path="teams" element={<RequireAuth><TeamsPage /></RequireAuth>} />
        <Route path="ut/players/:assetId" element={<UtPlayerPage />} />
        <Route path="ut/squad" element={<UtSquadPage />} />
        <Route path="ut/meta" element={<UtMetaPage />} />
        {/* V3-06a: tek veri kaynağı Web App yakalaması olan UT sayfaları; yakalama bayrağı kapalıyken tek kısa not (kod duruyor).
            v3: Katalog şablonlu SBC listesi; v2 sayfası (UtSbcPage/KbSbcList) dokunulmadan kalır. */}
        <Route path="ut/sbc" element={<CaptureOnly title="SBC çözücü">{isV3() ? <SbcListPage /> : <UtSbcPage />}</CaptureOnly>} />
        {/* V3-05d: v3'te çözüm sayfası (Detay şablonu, plan); v2'de eski çözücü. */}
        <Route path="ut/sbc/:setId/:challengeId" element={<CaptureOnly title="SBC çözücü">{isV3() ? <SbcSolvePage /> : <UtSbcChallengePage />}</CaptureOnly>} />
        <Route path="ut/sbc/:setId" element={<CaptureOnly title="SBC çözücü">{isV3() ? <SbcSolvePage /> : <UtSbcChallengePage />}</CaptureOnly>} />
        <Route path="ut/objectives" element={<CaptureOnly title="Objective planı"><UtObjectivesPage /></CaptureOnly>} />
        <Route path="ut/club" element={<CaptureOnly title="Kadrom"><UtClubPage /></CaptureOnly>} />
        <Route path="ut/import" element={<UtImportPage />} />
        <Route path="ut/evo" element={<CaptureOnly title="Evolution"><UtEvolutionsPage /></CaptureOnly>} />
        <Route path="admin/ut" element={<AdminUtPage />} />
        <Route path="profile" element={<RequireAuth>{isV3() ? <ProfileV3 /> : <ProfilePage />}</RequireAuth>} />
        <Route path="subscription" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
