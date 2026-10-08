import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isStaticHostWithoutApi } from '../api/client'
import { CompareTray } from './CompareTray'
import { useAuth } from '../auth/AuthContext'
import { Button, Pill } from './ui'
import { modeStore, useMode, type AppMode } from '../state/modeStore'
import { themeStore, useTheme } from '../state/themeStore'

const THEME_LABEL = { dark: 'Koyu', light: 'Açık', system: 'Sistem' } as const

interface NavGroup {
  to: string
  label: string
  match: string[]
  tabs?: { to: string; label: string }[]
}

const NAV: NavGroup[] = [
  {
    to: '/players',
    label: 'Oyuncular',
    match: ['/players', '/compare', '/wonderkids'],
    tabs: [
      { to: '/players', label: 'Oyuncu ara' },
      { to: '/wonderkids', label: 'Wonderkids' },
      { to: '/compare', label: 'Karşılaştır' },
    ],
  },
  {
    to: '/squad/builder',
    label: 'Taktik & Kadro',
    match: ['/tactics', '/squad', '/recommend', '/scouting'],
    tabs: [
      { to: '/squad/builder', label: 'Kadro kurucu' },
      { to: '/tactics/builder', label: 'Taktik & Uyum' },
      { to: '/tactics/wizard', label: 'Taktik sihirbazı' },
      { to: '/squad', label: 'Kadro' },
      { to: '/recommend', label: 'Transfer önerisi' },
      { to: '/scouting', label: 'Scouting' },
    ],
  },
  { to: '/teams', label: 'Takımlar', match: ['/teams'] },
  { to: '/career/import', label: 'İçe aktar', match: ['/career'] },
]

const UT_NAV: NavGroup[] = [
  { to: '/players', label: 'Kart veritabanı', match: ['/players', '/compare'] },
  { to: '/ut/squad', label: 'Kadro kurucu', match: ['/ut/squad'] },
  { to: '/ut/meta', label: 'Meta', match: ['/ut/meta'] },
  { to: '/ut/sbc', label: 'SBC çözücü', match: ['/ut/sbc'] },
  { to: '/ut/objectives', label: 'Objective planı', match: ['/ut/objectives'] },
  { to: '/ut/import', label: 'Kulüp içe aktar', match: ['/ut/import'] },
]

const MODES: { id: AppMode; label: string; home: string }[] = [
  { id: 'career', label: 'FC Career', home: '/' },
  { id: 'ut', label: 'Ultimate Team', home: '/ut/squad' },
]

export function Layout() {
  const mode = useMode()
  const theme = useTheme()
  const nav = mode === 'ut' ? UT_NAV : NAV
  const { authenticated, me, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/ut/') && modeStore.get() !== 'ut') {
      modeStore.set('ut')
    }
  }, [pathname])
  const activeGroup = nav.find((g) => g.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)))

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <NavLink to="/" className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            FC Kariyer
          </NavLink>
          <div role="group" aria-label="Mod" className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => {
                  modeStore.set(m.id)
                  navigate(m.home)
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${mode === m.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <nav aria-label="Ana menü" className="flex flex-1 flex-wrap gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${activeGroup === item ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => themeStore.cycle()}
              aria-label={`Tema: ${THEME_LABEL[theme]}. Değiştirmek için tıkla`}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {THEME_LABEL[theme]}
            </button>
            {authenticated && me ? (
              <>
                {me.subscriptionType === 'PREMIUM' ? <Pill tone="emerald">PREMIUM</Pill> : <Pill tone="sky">{me.creditBalance ?? 0} kredi</Pill>}
                <NavLink to="/profile" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                  {me.email}
                </NavLink>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await logout()
                    navigate('/login')
                  }}
                >
                  Çıkış
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="text-sm font-medium text-emerald-700 hover:underline">
                  Giriş
                </NavLink>
                <NavLink to="/register" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                  Kayıt ol
                </NavLink>
              </>
            )}
          </div>
        </div>
        {authenticated && me?.showAds && (
          <div role="complementary" aria-label="Reklam alanı" className="border-t border-dashed border-slate-300 bg-slate-50 py-1 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            Reklam alanı — PREMIUM ile kaldırılır
          </div>
        )}
      </header>
      {isStaticHostWithoutApi() && (
        <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          Bu yayın yalnızca arayüzdür: API adresi (<code>VITE_API_BASE_URL</code>) tanımlı olmadığı için veri yüklenmez.
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeGroup?.tabs && !/^\/players\/\d+/.test(pathname) && (
          <nav aria-label={`${activeGroup.label} sekmeleri`} className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
            {activeGroup.tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  `-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${isActive ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
        <Outlet />
        <CompareTray />
      </main>
    </div>
  )
}
