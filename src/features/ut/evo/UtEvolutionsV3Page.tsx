import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { KbEvolution } from '../../../api/types'
import { HelpPopover } from '../../../components/ui'
import { PageHeader } from '../../../design/components/PageHeader'
import { Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../../design/components/primitives'
import { timeLeft } from '../../../lib/timeLeft'
import { utCardStore } from '../../../state/utCardStore'
import { evoEligibility } from './evoEligibility'
import { levelCount, useUtEvolutions } from './useUtEvolutions'

const NUM = 'font-[var(--font-num)] tabular-nums'

function EvoCard({ evo, eligibility }: { evo: KbEvolution; eligibility: ReturnType<typeof evoEligibility> }) {
  const levels = levelCount(evo.levels)
  const left = timeLeft(evo.endsAt)
  return (
    <article aria-label={evo.name} className="glass-3 flex flex-col gap-2 rounded-[var(--radius-sm)] p-3 text-sm">
      <header className="flex items-start justify-between gap-2">
        <h3 lang="en" className="font-display text-lg font-semibold leading-tight">{evo.name}</h3>
        {evo.status === 'PENDING' && <Chip tone="warn">Doğrulanmamış</Chip>}
      </header>
      <div className="flex flex-wrap gap-1.5">
        {levels !== undefined && <Chip>{levels} seviye</Chip>}
        {left && <Chip tone={left.urgent ? 'bad' : undefined}>Bitiş {left.text}</Chip>}
      </div>
      <p className="text-xs text-ink-2">{eligibility.kind === 'count' ? <>Kulübünde uygun <b className={NUM}>{eligibility.count}</b> oyuncu</> : `Uygunluk: ${eligibility.reason}`}</p>
    </article>
  )
}

/**
 * v3 Evolution (/ut/evo, V3-07c; 08 §7): yalnız veride olan alanlar. KB'deki evolution'larda bugün ad, seviye sayısı ve durum var; maliyet, bitiş,
 * gereksinim, seviye yükseltmeleri (sonra-kartı statları), zincir ve pathway yok — uydurulmaz, kartta "veri yok" sebebi yazılır.
 * Kullanıcının yakalanan akademi slotları ayrıca listelenir.
 */
export function UtEvolutionsV3Page() {
  const { evolutions, mine } = useUtEvolutions()
  const library = useMemo(() => utCardStore.get(), [])
  const clubCards = useMemo(() => (library?.cards ?? []).filter((c) => c.source === 'club'), [library])
  const list = evolutions.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2">
      <PageHeader
        title="Evolution"
        help={<HelpPopover label="Hangi bilgiler var">Önce → sonra kartı, gereksinim çipleri, maliyet, bitiş ve "kulübünde uygun N oyuncu" yalnız evolution verisinde varsa gösterilir. Şu an tanımlarda yalnız ad ve seviye sayısı var; yükseltmeler hesaplanamadığı için tahmin gösterilmez.</HelpPopover>}
        subtitle="Güncel evolution'lar ve senin akademi slotların."
      />
      <Panel title={`Evolution'lar (${list.length})`}>
        {evolutions.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : evolutions.isError ? (
          <ErrorState message="Evolution'lar yüklenemedi." onRetry={() => evolutions.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState action={<Link to="/ut/import" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Kulübümü senkronla</Link>}>Henüz evolution tanımı yok. Akademi ekranını Web App'te açıp senkronlarsan kendi slotların da görünür.</EmptyState>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e) => <EvoCard key={e.id} evo={e} eligibility={evoEligibility(e, clubCards)} />)}
          </div>
        )}
      </Panel>
      {mine.length > 0 && (
        <Panel title={`Senin slotların (${mine.length})`}>
          <ul aria-label="Senin slotların" className="divide-y divide-[var(--glass-border)] text-sm">
            {mine.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between gap-2 py-2">
                <span>{slot.name ?? `#${slot.id}`}</span>
                <span className="flex items-center gap-1.5">
                  <Chip>{slot.levels} seviye</Chip>
                  {slot.status && <Chip tone={slot.status === 'COMPLETED' ? 'good' : undefined}>{slot.status === 'COMPLETED' ? 'Tamamlandı' : slot.status === 'STARTED' ? 'Devam ediyor' : slot.status}</Chip>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
