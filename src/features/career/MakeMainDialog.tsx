import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { AppDialog } from '../../design/components/AppDialog'
import { Button, Segmented } from '../../design/components/primitives'
import type { Lineup, TacticState } from '../../lib/tactic'
import { useMakeMainTactic } from './activeTactic'

const SLOTS = ['1', '2', '3', '4', '5'] as const

/** "Ana taktiğim yap": slot seç (dolu slot için ikinci onay, SaveToSlot deseni) → kaydet → ana taktik. */
export function MakeMainDialog({ careerId, name, tactic, lineup, onDone, onClose }: {
  careerId: number; name: string; tactic: Readonly<TacticState>; lineup: Readonly<Lineup>; onDone?: (slot: number) => void; onClose: () => void
}) {
  const slots = useQuery({ queryKey: ['user-tactics', careerId], queryFn: () => endpoints.userTactics(careerId) })
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>()
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const makeMain = useMakeMainTactic(careerId)
  const byslot = new Map((slots.data ?? []).map((t) => [String(t.slot), t]))
  const taken = slot ? byslot.get(slot) : undefined

  function submit() {
    if (!slot) {
      return
    }
    if (taken && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    makeMain.mutate({ slot: Number(slot), name, tactic, lineup }, {
      onSuccess: () => {
        onDone?.(Number(slot))
        onClose()
      },
    })
  }

  return (
    <AppDialog title="Ana taktiğim yap" hint="Taktik bir slota kaydedilir ve Masa, Kadro ve Transfer bu taktikle hesaplar." onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Segmented
          label="Kayıt slotu"
          value={slot ?? ('' as (typeof SLOTS)[number])}
          options={SLOTS.map((s) => ({ id: s, label: `Slot ${s} · ${byslot.get(s)?.name ?? 'boş'}` }))}
          onChange={(id) => {
            setSlot(id)
            setConfirmOverwrite(false)
          }}
        />
        {taken && <p className="text-sm text-ink-2">Slot {slot} dolu: “{taken.name}” üzerine yazılır.</p>}
        {makeMain.isError && <p role="alert" className="text-sm text-bad">Kaydedilemedi. Tekrar dene.</p>}
        <span>
          <Button variant="primary" disabled={!slot || makeMain.isPending} disabledReason={!slot ? 'Önce bir slot seç' : undefined} onClick={submit}>
            {confirmOverwrite ? 'Üzerine yazmak için tekrar bas' : 'Kaydet ve ana taktik yap'}
          </Button>
        </span>
      </div>
    </AppDialog>
  )
}
