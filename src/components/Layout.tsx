import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '../api/endpoints'
import { careerStore, useActiveCareerId } from '../state/careerStore'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useStorageError } from '../state/bigStore'
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
  { to: '/ut/club', label: 'Kadrom', match: ['/ut/club'] },
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
  const storageError = useStorageError()
  const mode = useMode()
  const theme = useTheme()
  const nav = mode === 'ut' ? UT_NAV : NAV
  const { authenticated, me, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const activeCareer = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])
  useEffect(() => {
    // Seçili kariyer kullanıcının listesinde yoksa (silinmiş/eski/yabancı id) temizle: 403 yerine model verisi.
    if (authenticated && careers.data && activeCareer !== undefined && !careers.data.some((c) => c.id === activeCareer)) {
      careerStore.set(careers.data[0]?.id)
    }
  }, [authenticated, careers.data, activeCareer])
  useEffect(() => {
    if (pathname.startsWith('/ut/') && modeStore.get() !== 'ut') {
      modeStore.set('ut')
    }
  }, [pathname])
  const activeGroup = nav.find((g) => g.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)))

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <NavLink to="/" className="shrink-0 text-lg font-bold text-accent">
            FC Kariyer
          </NavLink>
          <div role="group" aria-label="Mod" className="flex shrink-0 rounded-md border border-line p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => {
                  modeStore.set(m.id)
                  navigate(m.home)
                }}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${mode === m.id ? 'bg-accent-bg text-on-accent' : 'text-muted hover:bg-surface-2'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => themeStore.cycle()}
              aria-label={`Tema: ${THEME_LABEL[theme]}. Değiştirmek için tıkla`}
              className="hidden shrink-0 rounded-md border border-line px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2 sm:block"
            >
              {THEME_LABEL[theme]}
            </button>
            {authenticated && me ? (
              <>
                <span className="hidden shrink-0 sm:block">
                  {me.subscriptionType === 'PREMIUM' ? <Pill tone="emerald">PREMIUM</Pill> : <Pill tone="sky">{me.creditBalance ?? 0} kredi</Pill>}
                </span>
                <details className="group relative hidden min-w-0 lg:block">
                  <summary className="flex max-w-[190px] cursor-pointer list-none items-center gap-1 truncate rounded-md border border-line px-2.5 py-1 text-sm text-ink hover:bg-surface-2">
                    <span className="truncate">{me.email}</span>
                    <ChevronDown size={14} aria-hidden="true" />
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-line bg-surface p-1">
                    <NavLink to="/profile" className="block rounded-md px-3 py-1.5 text-sm hover:bg-surface-2">Profil</NavLink>
                    <button
                      type="button"
                      className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                      onClick={async () => {
                        await logout()
                        navigate('/login')
                      }}
                    >
                      Çıkış
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <NavLink to="/login" className="text-sm font-medium text-accent hover:underline">
                  Giriş
                </NavLink>
                <NavLink to="/register" className="whitespace-nowrap rounded-md bg-accent-bg px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90">
                  Kayıt ol
                </NavLink>
              </div>
            )}
            <button
              type="button"
              aria-label="Menüyü aç/kapat"
              aria-expanded={menuOpen}
              aria-controls="mobil-menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="shrink-0 rounded-md border border-line px-2.5 py-1 text-lg leading-none text-muted hover:bg-surface-2 lg:hidden"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="hidden border-t border-line lg:block">
          <nav aria-label="Ana menü" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:thin]">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${activeGroup === item ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {menuOpen && (
          <div id="mobil-menu" className="border-t border-line px-4 py-3 lg:hidden">
            <nav aria-label="Mobil menü" className="grid gap-1">
              {nav.flatMap((item) => [
                <NavLink key={item.to} to={item.to} className="rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2">
                  {item.label}
                </NavLink>,
                ...(item.tabs ?? []).map((tab) => (
                  <NavLink key={item.to + tab.to} to={tab.to} className="rounded-md px-6 py-1.5 text-sm text-muted hover:bg-surface-2">
                    {tab.label}
                  </NavLink>
                )),
              ])}
            </nav>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <button type="button" onClick={() => themeStore.cycle()} className="rounded-md border border-line px-2 py-1 text-xs font-medium text-muted">
                Tema: {THEME_LABEL[theme]}
              </button>
              {authenticated && me ? (
                <>
                  {me.subscriptionType === 'PREMIUM' ? <Pill tone="emerald">PREMIUM</Pill> : <Pill tone="sky">{me.creditBalance ?? 0} kredi</Pill>}
                  <NavLink to="/profile" className="text-sm text-muted hover:underline">{me.email}</NavLink>
                  <Button variant="ghost" onClick={async () => { await logout(); navigate('/login') }}>Çıkış</Button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="text-sm font-medium text-accent hover:underline">Giriş</NavLink>
                  <NavLink to="/register" className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90">Kayıt ol</NavLink>
                </>
              )}
            </div>
          </div>
        )}
        {authenticated && me?.showAds && (
          <div role="complementary" aria-label="Reklam alanı" className="border-t border-dashed border-line bg-surface-2 py-1 text-center text-xs text-muted">
            Reklam alanı — PREMIUM ile kaldırılır
          </div>
        )}
      </header>
      {isStaticHostWithoutApi() && (
        <div role="alert" className="border-b border-line bg-code-soft px-4 py-2 text-center text-sm text-code">
          Bu yayın yalnızca arayüzdür: API adresi (<code>VITE_API_BASE_URL</code>) tanımlı olmadığı için veri yüklenmez.
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeGroup?.tabs && !/^\/players\/\d+/.test(pathname) && (
          <nav aria-label={`${activeGroup.label} sekmeleri`} className="mb-4 flex gap-1 border-b border-line">
            {activeGroup.tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end
                className={({ isActive }) =>
                  `-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${isActive ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
        {storageError && <p role="alert" className="mb-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">{storageError}</p>}
        <Outlet />
        <CompareTray />
      </main>
    </div>
  )
}
