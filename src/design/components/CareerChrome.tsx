import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, FolderOpen, Plus, Shield, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Career } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import type { NavGroup } from '../../lib/navConfig'
import { careerStore, useActiveCareerId } from '../../state/careerStore'

/** Oyun tarihi (YYYY-AA-GG) → "19 Eylül 2027". Saat dilimi kaymasın diye UTC. */
function formatGameDate(iso: string | undefined): string | undefined {
  if (!iso) {
    return undefined
  }
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

/** `season` kariyerin kaçıncı sezonu (1, 2 …); yıl değil. */
const seasonLabel = (season: number | undefined) => (season ? `${season}. sezon` : undefined)

/**
 * FCA-3 kariyer üst barı (Stitch): kulüp, sezon ve oyun tarihi; yanında kariyer değiştirici. Kariyer yoksa yeni kariyer bağlantısı.
 * Oturum yoksa hiç çizilmez.
 */
export function CareerBar() {
  const { authenticated } = useAuth()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const activeId = useActiveCareerId()
  if (!authenticated) {
    return null
  }
  const list: Career[] = careers.data ?? []
  const active = list.find((c) => c.id === activeId) ?? list[0]
  const date = formatGameDate(active?.gameDate)
  const season = seasonLabel(active?.season)

  return (
    // FCA-12: <640 px'te mod anahtarı Daha fazla sheet'inde, yer kulüp adı ve tarihe kalır; 640–1023 px'te kulüp bilgisi gizli, değiştirici kalır.
    <section aria-label="Aktif kariyer" className="flex min-w-0 items-center gap-3 max-sm:flex-1 max-sm:gap-1.5">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-[var(--glass-3)] text-ink-2 max-[1023px]:hidden">
        <Shield size={18} />
      </span>
      {active ? (
        <div className="min-w-0 leading-tight max-sm:flex-1 min-[640px]:max-[1023px]:hidden">
          <p className="truncate font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-ink max-sm:text-base">{active.clubName ?? `Kulüp ${active.clubId}`}</p>
          <p className="truncate text-xs text-muted">
            {date ? <span>{date}</span> : null}
            {date && season ? ' · ' : null}
            {season ? <span>{season}</span> : null}
          </p>
        </div>
      ) : careers.isError ? (
        <p className="min-w-0 truncate text-sm text-bad max-sm:flex-1 min-[640px]:max-[1023px]:hidden">Kariyerler yüklenemedi</p>
      ) : careers.isLoading ? (
        <span role="status" aria-label="Kariyer yükleniyor" className="inline-block h-8 w-40 animate-pulse rounded-[var(--radius-sm)] bg-[var(--glass-3)] max-sm:w-auto max-sm:flex-1 min-[640px]:max-[1023px]:hidden" />
      ) : (
        <p className="min-w-0 truncate text-sm text-muted max-sm:flex-1 min-[640px]:max-[1023px]:hidden">Aktif kariyer yok</p>
      )}
      <CareerSwitcher list={list} activeId={active?.id} activeName={active ? active.clubName ?? `Kulüp ${active.clubId}` : undefined} />
    </section>
  )
}

function CareerSwitcher({ list, activeId, activeName }: { list: Career[]; activeId?: number; activeName?: string }) {
  return (
    <Popover.Root>
      {/* Dar ekranda kulüp adı gizli: aktif kariyer erişilebilir adda duyurulur. */}
      <Popover.Trigger aria-label={activeName ? `Kariyer değiştir · aktif: ${activeName}` : 'Kariyer değiştir'} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line bg-[var(--glass-3)] px-3 text-sm text-ink-2 hover:border-[var(--accent)] max-sm:min-h-11 max-sm:min-w-11 max-sm:px-0">
        <FolderOpen size={16} aria-hidden="true" />
        <span className="max-sm:sr-only">Kariyer değiştir</span>
        <ChevronDown size={14} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content aria-label="Kariyerler" align="start" sideOffset={6} className="z-50 w-72 rounded-[var(--radius-lg)] border border-line bg-[var(--glass-2)] p-1 text-ink shadow-[0_4px_16px_rgba(0,0,0,0.65)] outline-none">
          {list.map((c) => (
            <Popover.Close asChild key={c.id}>
              <button type="button" onClick={() => careerStore.set(c.id)} aria-current={c.id === activeId ? 'true' : undefined} className="flex min-h-10 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-sm hover:bg-[var(--glass-press)]">
                <span className="w-4 shrink-0 text-accent">{c.id === activeId ? <Check size={16} aria-hidden="true" /> : null}</span>
                <span className="min-w-0 flex-1 truncate">{c.clubName ?? `Kulüp ${c.clubId}`}</span>
                {c.season ? <span className="text-xs text-muted">{seasonLabel(c.season)}</span> : null}
              </button>
            </Popover.Close>
          ))}
          <Popover.Close asChild>
            <Link to="/career/new" className="mt-1 flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border-t border-line px-2 text-sm font-semibold text-accent hover:bg-[var(--glass-press)]">
              <Plus size={16} aria-hidden="true" /> Yeni kariyer
            </Link>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * FCA-3 kariyer sol menüsü (FM alışkanlığı, birebir değil): 240 px, ikon + etiket yatay; "Operasyon" ve "Yönetim" bölümleri.
 * Aktif öğe: yükseltilmiş yüzey, vurgu rengi, solda 2 px vurgu çizgisi.
 */
export function CareerSidebar({ nav, active, iconFor, unsavedPath }: { nav: NavGroup[]; active?: NavGroup; iconFor: (to: string) => LucideIcon; unsavedPath?: string }) {
  const sections: { id: string; title: string; items: NavGroup[] }[] = [
    { id: 'ops', title: 'Operasyon', items: nav.filter((g) => g.section !== 'admin') },
    { id: 'admin', title: 'Yönetim', items: nav.filter((g) => g.section === 'admin') },
  ]
  return (
    // 820–1023 px: 72 px ikon rayı (etiketler ekran okuyucuya); ≥1024 px: 240 px tam menü (Stitch tablet kuralı).
    <nav aria-label="Ana menü" className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] w-[72px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-[var(--glass-1)] py-4 min-[820px]:flex min-[1024px]:w-60">
      {sections.map((s) => s.items.length > 0 && (
        <div key={s.id} role="group" aria-labelledby={`menu-${s.id}`} className={`flex flex-col gap-0.5 ${s.id === 'admin' ? 'mt-auto' : ''}`}>
          {/* not-sr-only dolguyu sıfırlar: dolgu dış öğede, gizleme iç öğede. */}
          <p className="px-5 text-xs font-semibold uppercase tracking-[0.08em] text-muted min-[1024px]:pb-1">
            <span id={`menu-${s.id}`} className="sr-only min-[1024px]:not-sr-only">{s.title}</span>
          </p>
          {s.items.map((g) => <SidebarLink key={g.to} group={g} active={g === active} Icon={iconFor(g.to)} unsaved={g.to === unsavedPath} />)}
        </div>
      ))}
    </nav>
  )
}

const SIDEBAR_ITEM = 'relative flex min-h-11 items-center justify-center gap-3 px-2 text-sm font-medium min-[1024px]:min-h-10 min-[1024px]:justify-start min-[1024px]:px-5'
const sidebarTone = (active: boolean) =>
  active ? 'bg-[var(--glass-2)] font-bold text-accent before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-[var(--accent)]' : 'text-ink-2 hover:bg-[var(--glass-hover)] hover:text-ink'

/** İkon + etiket yatay; kaydedilmemiş Lab taslağında nokta ve erişilebilir ad (FAZ 4a kuralı). */
function SidebarLink({ group, active, Icon, unsaved }: { group: NavGroup; active: boolean; Icon: LucideIcon; unsaved: boolean }) {
  return (
    <Link to={group.to} aria-current={active ? 'page' : undefined} aria-label={unsaved ? `${group.label} · kaydedilmemiş taslak var` : undefined} title={group.label} className={`${SIDEBAR_ITEM} ${sidebarTone(active)}`}>
      <span className="relative block">
        <Icon size={18} aria-hidden="true" />
        {unsaved && <span data-unsaved-dot aria-hidden="true" className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--glass-1)]" />}
      </span>
      <span className="sr-only min-[1024px]:not-sr-only">{group.label}</span>
    </Link>
  )
}
