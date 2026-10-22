import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, LayoutDashboard, Plus, Upload } from 'lucide-react'
import { useId, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Career } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, Skeleton } from '../../design/components/primitives'
import { extensionCaptureEnabled } from '../../lib/features'
import { useActiveCareerId } from '../../state/careerStore'
import { bigStore } from '../../state/bigStore'
import { useMode } from '../../state/modeStore'
import { utCardStore } from '../../state/utCardStore'
import { SbcCard } from '../sbc/SbcCard'
import { useActiveSbcSets, useNow } from '../sbc/useActiveSbcSets'
import { SeasonJobs } from '../career/SeasonJobs'
import { useMainTacticFits } from '../career/useMainTacticFits'
import { teamFitPct } from '../squad/useSlotFits'

const SBC_SHOWN = 4
const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))' }
const LINK_BUTTON = 'inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-semibold max-sm:min-h-11'

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

/** "Kariyerine devam et": Masa ile aynı kaynaklar (ana taktik → useMainTacticFits → teamFitPct; 3 iş SeasonJobs/deskRules.seasonJobs), son içe aktarma tarihi. */
function ContinueCareer({ career }: { career: Career }) {
  const id = career.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id) })
  const snapshots = useQuery({ queryKey: ['snapshots', id], queryFn: () => endpoints.snapshots(id), retry: false })
  const { main, rows, pending } = useMainTacticFits(id, squad.data)
  const fit = teamFitPct(rows.map((r) => r.display))
  const lastImport = (snapshots.data ?? []).find((s) => s.source === 'IMPORT')
  return (
    <Section title="Kariyerine devam et" actions={<Link to="/career/dashboard" className={`${LINK_BUTTON} bg-accent text-on-accent hover:opacity-90`}>Masaya git</Link>}>
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-semibold">{career.name || career.clubName}</p>
        <p className="text-sm text-ink-2">{career.clubName}{lastImport ? ` · Son içe aktarma ${new Date(lastImport.takenAt).toLocaleDateString('tr-TR')}` : ' · Henüz içe aktarma yok'}</p>
      </div>
      <dl className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-[160px_1fr]">
        <div className="glass-3 flex flex-col px-3 py-2">
          <dt className="text-xs font-medium text-ink-2">Takım uyumu</dt>
          <dd className="font-[var(--font-num)] text-2xl font-semibold tabular-nums">{fit !== undefined ? `%${fit}` : squad.isLoading ? '…' : '—'}</dd>
        </div>
      </dl>
      <SeasonJobs careerId={id} squad={squad.data ?? []} rows={rows} tacticSource={main.source} record={lastImport && { kind: 'record', at: lastImport.takenAt }}
        gameDate={career.gameDate} pending={main.isLoading || pending || squad.isLoading} framed={false} />
    </Section>
  )
}

function CareerHome() {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  if (!authenticated) {
    return (
      <Section title="Kariyer modunu kendi kaydınla kullan">
        <p className="text-sm text-ink-2">Live Editor kaydını içe aktar; kadronun taktiğe uyumunu, zayıf halkaları ve bütçene uygun transfer adaylarını tek yerde gör.</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/register" className={`${LINK_BUTTON} bg-accent text-on-accent hover:opacity-90`}>Kayıt ol</Link>
          <Link to="/login" className={`${LINK_BUTTON} glass-3 text-ink hover:bg-[var(--glass-hover)]`}>Giriş yap</Link>
        </div>
      </Section>
    )
  }
  return (
    <>
      {careers.isLoading ? <Skeleton className="h-40" /> : career ? <ContinueCareer key={career.id} career={career} /> : (
        <EmptyState action={<Link to="/career/new" className={`${LINK_BUTTON} bg-accent text-on-accent hover:opacity-90`}>Yeni kariyer</Link>}>Henüz kariyerin yok. Kulübünü seç, masan hazır olsun.</EmptyState>
      )}
      <nav aria-label="Hızlı eylemler" className="grid grid-cols-2 gap-2 min-[820px]:grid-cols-4">
        {[
          { to: '/career/dashboard', label: 'Masa', icon: LayoutDashboard },
          { to: '/career/transfer', label: 'Transfer', icon: ArrowLeftRight },
          { to: '/career/import', label: 'İçe aktar', icon: Upload },
          { to: '/career/new', label: 'Yeni kariyer', icon: Plus },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="glass-3 flex min-h-14 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)]">
            <Icon size={18} aria-hidden="true" className="text-accent" />{label}
          </Link>
        ))}
      </nav>
    </>
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
 * Ana sayfa v3 (V3-07a, 08 §12) mod başına. Kariyer: "Kariyerine devam et" + hızlı eylemler; girişsiz kısa tanıtım. UT: bugünün SBC'leri ve kadrom özeti
 * (yalnız yakalama bayrağı açıkken); izlenen oyuncu verisi henüz yok → blok yok.
 */
export function HomePage() {
  const mode = useMode()
  const capture = extensionCaptureEnabled()
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-[28px] font-bold leading-8 tracking-[-0.005em] sm:text-[36px] sm:leading-10">FC Assist</h1>
        <p className="text-sm font-medium text-ink-2">{mode === 'ut' ? 'Ultimate Team' : 'Kariyer'}</p>
      </header>
      {mode === 'ut' ? (
        <>
          {capture && <TodaySbcs />}
          {capture && <ClubSummary />}
          <nav aria-label="Hızlı eylemler" className="grid grid-cols-2 gap-2 min-[820px]:grid-cols-4">
            {[{ to: '/players', label: 'Kart veritabanı' }, { to: '/ut/squad', label: 'Kadro kurucu' }, { to: '/ut/meta', label: 'Meta' }, { to: '/replicas', label: 'Replikalar' }].map((l) => (
              <Link key={l.to} to={l.to} className="glass-3 flex min-h-14 items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold text-ink hover:bg-[var(--glass-hover)]">{l.label}</Link>
            ))}
          </nav>
        </>
      ) : <CareerHome />}
    </div>
  )
}
