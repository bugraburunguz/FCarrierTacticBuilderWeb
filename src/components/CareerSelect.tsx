import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { careerStore, useActiveCareerId } from '../state/careerStore'
import { formatEur } from '../lib/format'
import { EmptyState, Field, Select, Spinner } from './ui'

/** Aktif kariyeri seçtirir; yoksa kadro sayfasına yönlendirir. */
export function CareerSelect() {
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const activeId = useActiveCareerId()

  if (careers.isLoading) {
    return <Spinner />
  }
  if (!careers.data || careers.data.length === 0) {
    return (
      <EmptyState>
        Henüz kariyerin yok. <Link to="/squad" className="text-emerald-700 underline">Kadro sayfasından</Link> bir kulüp seçerek başla.
      </EmptyState>
    )
  }
  const selected = careers.data.find((c) => c.id === activeId) ?? careers.data[0]
  if (selected.id !== activeId) {
    queueMicrotask(() => careerStore.set(selected.id))
  }
  return (
    <Field label="Kariyer">
      <Select value={selected.id} onChange={(e) => careerStore.set(Number(e.target.value))}>
        {careers.data.map((c) => (
          <option key={c.id} value={c.id}>
            {c.clubName ?? `Kulüp ${c.clubId}`} · bütçe {formatEur(c.budgetEur)} · {c.squadSize} oyuncu
          </option>
        ))}
      </Select>
    </Field>
  )
}
