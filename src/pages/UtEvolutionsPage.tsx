import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { timeLeft } from '../components/KbSbcList'
import { Card, EmptyState, Pill, Skeleton } from '../components/ui'
import { useUtCapture } from '../state/utCaptureStore'

/** Evolution listesi (UT-16): herkese açık tanımlar + (varsa) senin akademi slotların. Önce/sonra kartı ve kulüp uygunluğu sonraki iş. */
export function UtEvolutionsPage() {
  const evolutions = useQuery({ queryKey: ['kb-evolutions'], queryFn: endpoints.kbEvolutions, staleTime: 60_000 })
  const capture = useUtCapture()
  const mine = capture?.evolutions ?? []

  return (
    <div className="space-y-4">
      <Card title={`Evolution'lar (${evolutions.data?.length ?? 0})`}>
        {evolutions.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
        {evolutions.data?.length === 0 && (
          <EmptyState action={<Link to="/ut/import" className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-semibold text-on-accent">Kulübümü senkronla</Link>}>
            Henüz herkese açık evolution tanımı yok. Akademi ekranını Web App'te açıp senkronlarsan kendi slotların aşağıda görünür.
          </EmptyState>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(evolutions.data ?? []).map((e) => {
            const left = timeLeft(e.endsAt)
            return (
              <li key={e.id} className="rounded-md border border-line p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold uppercase leading-tight">{e.name}</h3>
                  {e.status === 'PENDING' && <Pill tone="amber">doğrulanmamış</Pill>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {left && <span className={`num font-medium ${left.urgent ? 'text-danger' : ''}`}>{left.urgent ? 'Son ' : ''}{left.text}</span>}
                  {typeof e.levels === 'number' && <span>{e.levels} seviye</span>}
                  {e.requirements && typeof e.requirements.requirementCount === 'number' && <span>{e.requirements.requirementCount as number} şart</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
      {mine.length > 0 && (
        <Card title={`Senin slotların (${mine.length})`}>
          <ul className="divide-y divide-line text-sm">
            {mine.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>{slot.name ?? `#${slot.id}`}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span>{slot.levels} seviye</span>
                  {slot.status && <Pill tone={slot.status === 'COMPLETED' ? 'emerald' : 'slate'}>{slot.status}</Pill>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
