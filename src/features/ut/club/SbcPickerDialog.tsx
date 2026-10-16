import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../../api/endpoints'
import { AppDialog } from '../../../design/components/AppDialog'
import { EmptyState, ErrorState, Skeleton } from '../../../design/components/primitives'
import { solveHref } from '../../sbc/solve/lockParam'

const STALE_MS = 120_000

function Challenges({ setId, keys }: { setId: number; keys: string[] }) {
  const set = useQuery({ queryKey: ['kb-sbc-set', setId], queryFn: () => endpoints.kbSbcSet(setId), staleTime: STALE_MS, retry: false })
  if (set.isLoading) {
    return <Skeleton className="h-10" />
  }
  if (set.isError) {
    return <ErrorState message="Görevler yüklenemedi." onRetry={() => set.refetch()} />
  }
  const challenges = set.data?.challenges ?? []
  return challenges.length === 0 ? <p className="py-1 text-xs text-ink-2">Bu setin görevleri bilgi tabanında yok.</p> : (
    <ul className="flex flex-col gap-1 py-1">
      {challenges.map((c) => (
        <li key={c.id}><Link to={solveHref(setId, c.id, keys)} className="glass-3 flex min-h-10 items-center rounded-[var(--radius-sm)] px-3 text-sm font-medium hover:bg-[var(--glass-hover)] max-sm:min-h-11">{c.name}</Link></li>
      ))}
    </ul>
  )
}

/** "Şu SBC'de kullan" (V3-07c): aktif SBC setinden görev seçtirir; seçilen kartlar çözüm sayfasında Özelleştir'de kilitli açılır (?kilit=). */
export function SbcPickerDialog({ keys, onClose }: { keys: string[]; onClose: () => void }) {
  const sets = useQuery({ queryKey: ['kb-sbc', 'active'], queryFn: () => endpoints.kbSbc({ active: true }), staleTime: STALE_MS })
  const [open, setOpen] = useState<number>()
  return (
    <AppDialog title="Şu SBC'de kullan" hint={`${keys.length} kart Özelleştir'de kilitli açılır`} onClose={onClose}>
      {sets.isLoading ? <Skeleton className="h-32" /> : sets.isError ? <ErrorState message="SBC setleri yüklenemedi." onRetry={() => sets.refetch()} /> : (sets.data ?? []).length === 0 ? (
        <EmptyState>Aktif SBC yok. Web App'te SBC ekranını açıp senkronla.</EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--glass-border)]">
          {sets.data!.map((s) => (
            <li key={s.id} className="py-1">
              <button type="button" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? undefined : s.id)} className="flex min-h-10 w-full items-center justify-between gap-2 text-left text-sm font-semibold max-sm:min-h-11">
                <span lang="en">{s.name} <span className="font-normal text-ink-2">· {s.challengeCount} görev</span></span>
                <ChevronDown size={16} aria-hidden="true" className={open === s.id ? 'rotate-180' : ''} />
              </button>
              {open === s.id && <Challenges setId={s.id} keys={keys} />}
            </li>
          ))}
        </ul>
      )}
    </AppDialog>
  )
}
