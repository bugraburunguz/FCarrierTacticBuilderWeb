import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import { careerStore, useActiveCareerId } from '../state/careerStore'
import { formatEur } from '../lib/format'
import { Modal } from './Modal'
import { NewCareerForm } from './NewCareerForm'
import { Button, Field, Select, Spinner } from './ui'

/** Aktif kariyeri seçtirir; yeni kariyer buradan veri aktarmadan oluşturulabilir. */
export function CareerSelect() {
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const activeId = useActiveCareerId()
  const [creating, setCreating] = useState(false)

  if (careers.isLoading) {
    return <Spinner />
  }
  const list = careers.data ?? []
  const selected = list.find((c) => c.id === activeId) ?? list[0]
  if (selected && selected.id !== activeId) {
    queueMicrotask(() => careerStore.set(selected.id))
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {selected ? (
        <Field label="Kariyer">
          <Select value={selected.id} onChange={(e) => careerStore.set(Number(e.target.value))}>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ? `${c.name} · ` : ''}{c.clubName ?? `Kulüp ${c.clubId}`} · bütçe {formatEur(c.budgetEur)} · {c.squadSize} oyuncu
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-sm text-muted">Henüz kariyerin yok. Bir kulüp seçerek veri aktarmadan yeni kariyer başlatabilirsin.</p>
      )}
      <Button variant={selected ? 'secondary' : 'primary'} onClick={() => setCreating(true)}>
        + Yeni kariyer
      </Button>
      {creating && (
        <Modal wide title="Yeni kariyer" hint="Kulüp seç, bütçeni gir; veri aktarmak şart değil" onClose={() => setCreating(false)}>
          <NewCareerForm onCreated={() => setCreating(false)} />
        </Modal>
      )}
    </div>
  )
}
