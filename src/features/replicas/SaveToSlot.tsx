import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { ErrorBox } from '../../components/ui'
import { Button, Chip } from '../../design/components/primitives'

const SLOTS = [1, 2, 3, 4, 5]

/** "Taktik slotuma kaydet": 5 slot; kod ve ayarlar kopyalanır, kayıt kaynağı replikayı tutar. Dolu slotun üzerine yazmak ikinci bir onay ister. */
export function SaveToSlot({ replicaId, careerId }: { replicaId: string; careerId?: number }) {
  const client = useQueryClient()
  const saved = useQuery({ queryKey: ['user-tactics', careerId ?? 'ut'], queryFn: () => endpoints.userTactics(careerId) })
  const [slot, setSlot] = useState<number>()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState<string>()
  const byslot = new Map((saved.data ?? []).map((t) => [t.slot, t]))
  const occupied = slot !== undefined ? byslot.get(slot) : undefined
  const save = useMutation({
    mutationFn: () => endpoints.saveUserTactic(slot!, { careerId, replicaId }),
    onSuccess: (t) => {
      setDone(`Slot ${t.slot}'e kaydedildi: ${t.name}`)
      setConfirm(false)
      return client.invalidateQueries({ queryKey: ['user-tactics', careerId ?? 'ut'] })
    },
  })

  function onSave() {
    setDone(undefined)
    if (occupied && !confirm) {
      setConfirm(true)
      return
    }
    save.mutate()
  }

  return (
    <section aria-label="Taktik slotuma kaydet" className="flex flex-col gap-2">
      <h3 className="font-display text-xl font-semibold leading-6">Taktik slotuma kaydet</h3>
      <div role="group" aria-label="Slot seç" className="flex flex-wrap gap-1.5">
        {SLOTS.map((n) => (
          <Chip
            key={n}
            pressed={slot === n}
            title={byslot.get(n)?.name ?? 'Boş slot'}
            onClick={() => {
              setSlot(n)
              setConfirm(false)
              setDone(undefined)
            }}
          >
            {n}{byslot.has(n) ? ' · dolu' : ''}
          </Chip>
        ))}
      </div>
      {confirm && occupied && <p role="status" className="text-sm text-ink-2">Slot {slot} dolu ({occupied.name}). Üzerine yazılsın mı?</p>}
      <div>
        <Button variant="primary" disabled={slot === undefined || save.isPending} disabledReason={slot === undefined ? 'Önce bir slot seç.' : undefined} onClick={onSave}>
          {save.isPending ? 'Kaydediliyor…' : confirm ? 'Evet, üzerine yaz' : 'Kaydet'}
        </Button>
      </div>
      {done && <p role="status" className="text-sm text-good">{done}</p>}
      <ErrorBox error={save.error ?? saved.error} />
    </section>
  )
}
