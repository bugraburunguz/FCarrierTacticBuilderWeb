import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../../api/endpoints'
import type { Career } from '../../../api/types'
import { DeleteCareerButton } from '../../../components/DeleteCareerButton'
import { MoneyInput } from '../../../components/MoneyInput'
import { ErrorBox, Field, Input } from '../../../components/ui'
import { Button, Chip, Panel } from '../../../design/components/primitives'
import { useInvalidateCareer } from './useCareerSquad'

const GENDER_LABEL: Record<number, string> = { 0: 'Erkek', 1: 'Kadın' }

/**
 * Kariyer ayarları (ad, transfer bütçesi, sezon) ve silme. Çağıran `key={career.id}` verir (başka kariyerin değerleri taşınmaz).
 * Silme v3'teki ortak onaylı diyalogla (DeleteCareerButton: kariyer adı yazılmadan silinmez).
 */
export function CareerSettingsPanel({ career }: { career: Career }) {
  const refresh = useInvalidateCareer()
  const [name, setName] = useState(career.name ?? '')
  const [budget, setBudget] = useState<number | undefined>(career.budgetEur ?? undefined)
  const [season, setSeason] = useState(String(career.season ?? 1))
  const save = useMutation({
    mutationFn: () => endpoints.updateCareer(career.id, { name, budgetEur: budget, season: Number(season) || 1 }),
    onSuccess: refresh,
  })
  return (
    <Panel title="Kariyer ayarları" actions={career.gender !== undefined ? <Chip tone="info">{GENDER_LABEL[career.gender]} futbolu</Chip> : undefined}>
      <div className="grid gap-3 sm:grid-cols-[1fr_minmax(200px,300px)_100px] sm:items-start">
        <Field label="Ad">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <MoneyInput value={budget} onChange={setBudget} ariaLabel="Transfer bütçesi (€)" />
        </Field>
        <Field label="Sezon">
          <Input type="number" min={1} value={season} onChange={(e) => setSeason(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>Kaydet</Button>
        <DeleteCareerButton career={career} />
      </div>
      <ErrorBox error={save.error} />
    </Panel>
  )
}
