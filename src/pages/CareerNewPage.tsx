import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { DeleteCareerButton } from '../components/DeleteCareerButton'
import { NewCareerForm } from '../components/NewCareerForm'
import { Button, Card, EmptyState, Pill, Skeleton } from '../components/ui'
import { formatEur } from '../lib/format'
import { careerStore, useActiveCareerId } from '../state/careerStore'

export function CareerNewPage() {
  const navigate = useNavigate()
  const activeId = useActiveCareerId()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card title="Yeni kariyer">
        <NewCareerForm onCreated={() => navigate('/career/desk')} />
        <p className="mt-2 text-sm text-muted">Gerçek save verin var mı? <Link to="/career/import" className="underline">İçe aktar</Link></p>
      </Card>

      <Card title={`Kariyerlerin (${careers.data?.length ?? 0})`}>
        {careers.isLoading && <Skeleton className="h-16" />}
        {!careers.isLoading && (careers.data ?? []).length === 0 && <EmptyState>Henüz kariyerin yok.</EmptyState>}
        <ul className="divide-y divide-line">
          {(careers.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0 text-sm">
                <b>{c.name || c.clubName || `Kulüp ${c.clubId}`}</b>{' '}
                {c.id === activeId && <Pill tone="emerald">Aktif</Pill>}
                <span className="block text-xs text-muted">{c.clubName} · sezon {c.season ?? 1} · {c.squadSize} oyuncu · bütçe {formatEur(c.budgetEur)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.id !== activeId && <Button variant="secondary" onClick={() => careerStore.set(c.id)}>Aktif yap</Button>}
                <Button variant="secondary" onClick={() => { careerStore.set(c.id); navigate('/career/desk') }}>Aç</Button>
                <DeleteCareerButton career={c} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Sildikten sonra aynı kulüple yeni kariyer başlatabilir ya da <Link to="/career/import" className="underline">save verini yeniden yükleyebilirsin</Link>.</p>
      </Card>
    </div>
  )
}
