import { useId, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Skeleton } from '../../design/components/primitives'
import { extensionCaptureEnabled } from '../../lib/features'
import { bigStore } from '../../state/bigStore'
import { utCardStore } from '../../state/utCardStore'
import { SbcCard } from '../sbc/SbcCard'
import { useActiveSbcSets, useNow } from '../sbc/useActiveSbcSets'
import { Landing } from './Landing'

const SBC_SHOWN = 4
const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))' }

function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="glass-2 flex min-w-0 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-display text-xl font-semibold leading-6">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}

function TodaySbcs() {
  const now = useNow()
  const { sets, all, itemMap, nameMap, voteMap } = useActiveSbcSets()
  const newest = useMemo(() => [...all].sort((a, b) => (b.firstSeenAt ?? '').localeCompare(a.firstSeenAt ?? '')).slice(0, SBC_SHOWN), [all])
  return (
    <Section title="Bugünün SBC'leri" actions={<Link to="/ut/sbc" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">Tümü</Link>}>
      {sets.isLoading ? <Skeleton className="h-48" /> : newest.length === 0 ? <p className="text-sm text-ink-2">Bilgi tabanında aktif SBC yok; uzantıyla Web App'i senkronla.</p> : (
        <ul className="grid gap-3" style={GRID_STYLE}>
          {newest.map((s) => <SbcCard key={s.id} set={s} items={itemMap} names={nameMap} votes={voteMap.get(s.id)} now={now} />)}
        </ul>
      )}
    </Section>
  )
}

function ClubSummary() {
  const library = useSyncExternalStore(bigStore.subscribe, () => utCardStore.get())
  const club = (library?.cards ?? []).filter((c) => c.source === 'club')
  if (club.length === 0) {
    return null
  }
  const best = Math.max(...club.map((c) => c.rating))
  return (
    <Section title="Kadrom" actions={<Link to="/ut/club" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">Kulübe git</Link>}>
      <p className="text-sm">Yakalanmış kulübünde <b>{club.length} kart</b> · en yüksek {best}</p>
    </Section>
  )
}

/**
 * Ana sayfa (/). Girişsiz: FCA-26 karşılama sayfası (her modda). Girişli UT: bugünün SBC'leri ve kadrom özeti (yalnız yakalama bayrağı açıkken).
 * Girişli kariyer bu sayfayı görmez; HomeRoute Masa'ya yönlendirir (FCA-28).
 */
export function HomePage() {
  const capture = extensionCaptureEnabled()
  const { authenticated } = useAuth()
  if (!authenticated) {
    return <Landing />
  }
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-[28px] font-bold leading-8 tracking-[-0.005em] sm:text-[36px] sm:leading-10">FC Assist</h1>
        <p className="text-sm font-medium text-ink-2">Ultimate Team</p>
      </header>
      {capture && <TodaySbcs />}
      {capture && <ClubSummary />}
      <nav aria-label="Hızlı eylemler" className="grid grid-cols-2 gap-2 min-[820px]:grid-cols-4">
        {[{ to: '/players', label: 'Kart veritabanı' }, { to: '/ut/squad', label: 'Kadro kurucu' }, { to: '/ut/meta', label: 'Meta' }, { to: '/replicas', label: 'Replikalar' }].map((l) => (
          <Link key={l.to} to={l.to} className="glass-3 flex min-h-14 items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)]">{l.label}</Link>
        ))}
      </nav>
    </div>
  )
}
