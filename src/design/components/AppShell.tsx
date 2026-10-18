import { ArrowLeftRight, Database, Layers, LayoutDashboard, LayoutTemplate, MoreHorizontal, Plus, Puzzle, Shield, Sparkles, Swords, Target, TrendingUp, Upload, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isStaticHostWithoutApi } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { CompareTray } from '../../components/CompareTray'
import { useShellEffects } from '../../components/useShellEffects'
import { VerifyEmailBanner } from '../../components/VerifyEmailBanner'
import { PrivacyNoticeBanner } from '../../features/legal/PrivacyNoticeBanner'
import { extensionCaptureEnabled } from '../../lib/features'
import { activeNav, MODES, mobileBar, navFor, type NavGroup } from '../../lib/navConfig'
import { MobileSheet } from './MobileSheet'
import { BETA_TEXT, useAppConfig } from '../../state/appConfig'
import { useStorageError } from '../../state/bigStore'
import { modeStore, useMode } from '../../state/modeStore'
import { LogoLockup } from '../brand/LogoLockup'
import { LEGAL_NOTE } from '../brand/legal'
import { Chip, Segmented } from './primitives'
import { MobileMenu, ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const ICONS: Record<string, LucideIcon> = {
  '/career/desk': LayoutDashboard,
  '/career/transfer': ArrowLeftRight,
  '/career/growth': TrendingUp,
  '/career/new': Plus,
  '/players': Users,
  '/squad/builder': Swords,
  '/teams': Shield,
  '/career/import': Upload,
  '/ut/squad': LayoutTemplate,
  '/ut/club': Layers,
  '/ut/meta': Sparkles,
  '/ut/sbc': Puzzle,
  '/ut/objectives': Target,
  '/ut/evo': Sparkles,
  '/ut/import': Upload,
}

const RAIL_ITEM = 'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1.5 text-center text-xs font-medium leading-4'
const railTone = (active: boolean) => (active ? 'bg-[var(--accent-soft)] text-accent' : 'text-ink-2 hover:bg-[var(--glass-hover)]')

/** Küçük, kabuk-içi gezinme öğesi: ikon + etiket (rayda 72px, mobilde alt çubukta kısa etiketle). aria-current rotadan gelir. */
function RailLink({ group, active, short = false, onNavigate }: { group: NavGroup; active: boolean; short?: boolean; onNavigate?: () => void }) {
  const Icon = ICONS[group.to] ?? Database
  return (
    <NavLink to={group.to} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={`${RAIL_ITEM} ${railTone(active)}`}>
      <Icon size={20} aria-hidden="true" />
      <span className="max-w-full break-words">{short ? group.mobileLabel ?? group.label : group.label}</span>
    </NavLink>
  )
}

/** Mobil alt çubuk (V3-06d): kariyerde 4 öğe + "Daha fazla" sheet'i (aktif öğe sheet'teyse düğme aktif görünür); UT'de ilk 5 öğe. */
function MobileBar({ mode, nav, active, pathname }: { mode: 'career' | 'ut'; nav: NavGroup[]; active?: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const { items, more } = mobileBar(mode, nav)
  const moreActive = more.find((g) => g === active || pathname === g.to)
  return (
    <nav aria-label="Mobil menü" className="glass glass-sticky fixed inset-x-0 bottom-0 z-20 grid h-16 grid-flow-col auto-cols-fr items-stretch gap-0.5 rounded-none border-x-0 border-b-0 px-1 min-[820px]:hidden">
      {items.map((g) => (
        <RailLink key={g.to} group={g} active={g === active} short />
      ))}
      {more.length > 0 && (
        <button type="button" aria-current={moreActive ? 'page' : undefined} aria-haspopup="dialog" onClick={() => setOpen(true)} className={`${RAIL_ITEM} ${railTone(Boolean(moreActive))}`}>
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>Daha fazla</span>
        </button>
      )}
      {open && (
        <MobileSheet title="Daha fazla" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            {more.map((g) => (
              <RailLink key={g.to} group={g} active={g === moreActive} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        </MobileSheet>
      )}
    </nav>
  )
}

/**
 * v3 AppShell (11 §6): üstte 56px cam bar (logo + mod anahtarı + tema + hesap), masaüstünde solda cam ray, mobilde altta 64px cam tab bar.
 * Mod = URL öneki (WEB-BUG-07). Hesap alanında tek birincil eylem: Kayıt ol primary, Giriş ikincil (Q14).
 */
export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mode = useMode()
  const storageError = useStorageError()
  const { authenticated, me, logout } = useAuth()
  const { freeBeta } = useAppConfig()
  useShellEffects(pathname)
  // Uzantı yakalaması kapalıyken (VITE_EXTENSION_CAPTURE=off) yakalamaya bağlı UT öğeleri yan menüden ve mobil alt menüden çıkar (V3-06a).
  // V3-06d: kariyerde tek menü (CAREER_NAV); aktif öğe rotadan.
  const nav = navFor(mode, extensionCaptureEnabled(), true)
  const active = activeNav(nav, pathname)
  const showTabs = !/^\/players\/\d+/.test(pathname)

  return (
    <div className="min-h-screen text-ink">
      <header className="glass glass-sticky sticky top-0 z-30 flex h-[var(--header-h)] min-w-0 items-center gap-2 sm:gap-3 rounded-none border-x-0 border-t-0 px-4 max-[359px]:gap-1.5 max-[359px]:px-3">
        <LogoLockup size={32} collapse />
        <Segmented
          label="Mod"
          value={mode}
          options={MODES.map((m) => ({ id: m.id, label: m.id === 'ut' ? 'UT' : 'Kariyer' }))}
          onChange={(id) => {
            modeStore.set(id)
            navigate(MODES.find((m) => m.id === id)?.home ?? '/')
          }}
        />
        <div className="ml-auto flex items-center gap-2 max-[359px]:gap-1.5">
          <ThemeToggle className="max-sm:hidden" />
          <MobileMenu loginLink={!authenticated} email={authenticated && me ? me.email : undefined} onLogout={authenticated && me ? async () => { await logout(); navigate('/login') } : undefined} />
          {authenticated && me ? (
            <>
              <span className="hidden sm:block">{freeBeta ? <Chip tone="good">{BETA_TEXT}</Chip> : me.subscriptionType === 'PREMIUM' ? <Chip tone="good">PREMIUM</Chip> : <Chip tone="info">{me.creditBalance ?? 0} kredi</Chip>}</span>
              <UserMenu email={me.email} onLogout={async () => { await logout(); navigate('/login') }} />
            </>
          ) : authenticated ? (
            // Oturum anahtarı var, profil yükleniyor ya da geçici hata (ör. 429): "Kayıt ol" göstermek kullanıcıyı çıkış yapmış sandırıyordu.
            <span aria-label="Hesap yükleniyor" role="status" className="glass-3 inline-block h-10 w-28 animate-pulse rounded-[var(--radius-sm)] max-sm:h-11" />
          ) : (
            <>
              <NavLink to="/login" className="glass-3 inline-flex max-[479px]:hidden min-h-10 items-center rounded-[var(--radius-sm)] px-4 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)] max-sm:min-h-11">Giriş</NavLink>
              <NavLink to="/register" className="inline-flex min-h-10 whitespace-nowrap items-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11 max-[359px]:px-3">Kayıt ol</NavLink>
            </>
          )}
        </div>
      </header>

      {isStaticHostWithoutApi() && (
        <div role="alert" className="bg-[var(--warn-soft)] px-4 py-2 text-center text-sm text-warn">
          Bu yayın yalnızca arayüzdür: API adresi (<code>VITE_API_BASE_URL</code>) tanımlı olmadığı için veri yüklenmez.
        </div>
      )}
      {authenticated && <VerifyEmailBanner />}
      {authenticated && <PrivacyNoticeBanner />}

      <div className="flex">
        <nav aria-label="Ana menü" className="glass sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] w-[88px] shrink-0 flex-col gap-1 overflow-y-auto rounded-none border-y-0 border-l-0 p-2 min-[820px]:flex">
          {nav.map((g) => (
            <RailLink key={g.to} group={g} active={g === active} />
          ))}
        </nav>
        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-24 pt-3 min-[820px]:pb-8">
          {storageError && (
            <div role="alert" className="mb-3 rounded-[var(--radius-sm)] bg-[var(--warn-soft)] px-3 py-2 text-sm text-warn">
              {storageError}
            </div>
          )}
          {/* V3-06d: alt sekmeler (Oyuncular, Taktik & Kadro) her genişlikte sayfa içinde; üst çubukta sekme yok. */}
          {active?.tabs && showTabs && (
            <nav aria-label={`${active.label} sekmeleri`} className="mb-4 flex flex-wrap gap-1">
              {active.tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end
                  className={({ isActive: on }) => `inline-flex min-h-8 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium max-sm:min-h-11 ${on ? 'bg-[var(--glass-press)] text-ink shadow-[inset_0_-2px_0_var(--accent)]' : 'text-ink-2 hover:bg-[var(--glass-hover)]'}`}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          )}
          <Outlet />
          <footer className="mt-10 flex flex-col gap-1 border-t border-line pt-4 text-xs text-muted">
            <p>{LEGAL_NOTE}</p>
            <div className="flex flex-wrap gap-x-4">
              <NavLink to="/about" className="inline-flex min-h-8 items-center font-semibold text-accent max-sm:min-h-11">Hakkında</NavLink>
              <NavLink to="/privacy" className="inline-flex min-h-8 items-center font-semibold text-accent max-sm:min-h-11">Gizlilik</NavLink>
            </div>
          </footer>
        </main>
      </div>

      <MobileBar mode={mode} nav={nav} active={active} pathname={pathname} />
      <CompareTray />
    </div>
  )
}
