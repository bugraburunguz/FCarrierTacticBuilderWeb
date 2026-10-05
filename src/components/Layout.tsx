import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button, Pill } from './ui'

const NAV = [
  { to: '/players', label: 'Oyuncular' },
  { to: '/compare', label: 'Karşılaştır' },
  { to: '/tactics/builder', label: 'Taktik' },
  { to: '/squad', label: 'Kadro' },
  { to: '/fit', label: 'Uyum' },
  { to: '/recommend', label: 'Öneri' },
  { to: '/career/import', label: 'İçe aktar' },
]

export function Layout() {
  const { authenticated, me, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <NavLink to="/" className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            FC Kariyer
          </NavLink>
          <nav aria-label="Ana menü" className="flex flex-1 flex-wrap gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
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
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
