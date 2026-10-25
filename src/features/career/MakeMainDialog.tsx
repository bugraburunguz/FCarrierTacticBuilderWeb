import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { AppDialog } from '../../design/components/AppDialog'
import { Button, Segmented } from '../../design/components/primitives'
import { mainTacticName, type Lineup, type TacticState } from '../../lib/tactic'
import { useMakeMainTactic } from './activeTactic'

const SLOTS = ['1', '2', '3', '4', '5'] as const
const NAME_MAX = 40

/** "Ana taktiğim yap": ad ver, slot seç (dolu slot için ikinci onay, SaveToSlot deseni) → kaydet → ana taktik. */
export function MakeMainDialog({ careerId, name, tactic, lineup, onDone, onClose }: {
  careerId: number; name: string; tactic: Readonly<TacticState>; lineup: Readonly<Lineup>; onDone?: (slot: number) => void; onClose: () => void
}) {
  const slots = useQuery({ queryKey: ['user-tactics', careerId], queryFn: () => endpoints.userTactics(careerId) })
  const nameId = useId()
  // FAZ 6a-F: ad sorulur; göçten gelen ya da boş ad yerine "Ana taktik · <formasyon>" önerilir.
  const [title, setTitle] = useState(() => mainTacticName(name, tactic.formation))
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>()
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const makeMain = useMakeMainTactic(careerId)
  const byslot = new Map((slots.data ?? []).map((t) => [String(t.slot), t]))
  const taken = slot ? byslot.get(slot) : undefined

  function submit() {
    if (!slot || !title.trim()) {
      return
    }
    if (taken && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    makeMain.mutate({ slot: Number(slot), name: title.trim(), tactic, lineup }, {
      onSuccess: () => {
        onDone?.(Number(slot))
        onClose()
      },
    })
  }

  return (
    <AppDialog title="Ana taktiğim yap" hint="Taktik bir slota kaydedilir ve Masa, Kadro ve Transfer bu taktikle hesaplar." onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label htmlFor={nameId} className="flex flex-col gap-1 text-sm font-medium">
          Ana taktik adı
          <input id={nameId} value={title} maxLength={NAME_MAX} onChange={(e) => setTitle(e.target.value)}
            className="glass-3 min-h-10 rounded-[var(--radius-sm)] px-3 text-sm font-normal text-ink max-sm:min-h-11" />
        </label>
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
          <Button variant="primary" disabled={!slot || !title.trim() || makeMain.isPending}
            disabledReason={!slot ? 'Önce bir slot seç' : !title.trim() ? 'Taktiğe bir ad ver' : undefined} onClick={submit}>
            {confirmOverwrite ? 'Üzerine yazmak için tekrar bas' : 'Kaydet ve ana taktik yap'}
          </Button>
        </span>
      </div>
    </AppDialog>
  )
}
