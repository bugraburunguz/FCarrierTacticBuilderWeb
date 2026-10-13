import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { Career } from '../api/types'
import { careerStore } from '../state/careerStore'
import { Button, ErrorBox } from './ui'

/**
 * Yıkıcı eylem yalnız kariyer ayarlarında durur (F9): onay diyaloğu kariyer adını yazdırır (adı yazmadan silinemez).
 * Ana sayfada ve kadro ekranlarında görünmez.
 */
export function DeleteCareerButton({ career, onDeleted }: { career: Career; onDeleted?: () => void }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const expected = career.name || career.clubName || ''
  const remove = useMutation({
    mutationFn: () => endpoints.deleteCareer(career.id),
    onSuccess: async () => {
      client.setQueryData<Career[]>(['careers'], (old) => (old ?? []).filter((c) => c.id !== career.id))
      careerStore.set(undefined)
      await Promise.all(['careers', 'squad', 'events', 'snapshots', 'shortlist', 'tags'].map((k) => client.invalidateQueries({ queryKey: [k] })))
      setOpen(false)
      onDeleted?.()
    },
  })
  return (
    <>
      <Button variant="danger" onClick={() => { setTyped(''); setOpen(true) }}>
        Kariyeri sil
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--sheet-bg)] p-5 text-ink outline-none">
            <Dialog.Title className="font-display text-xl font-semibold">Kariyeri sil</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-ink-2">
              “{expected}” kariyeri; kadro, hareketler, kayıtlar, kısa liste ve notlar dahil tamamen silinir. Bu geri alınamaz.
            </Dialog.Description>
            <label className="mt-4 block text-sm">
              Onaylamak için kariyer adını yaz: <b>{expected}</b>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} className="glass-3 mt-1 min-h-10 w-full px-3 text-sm text-ink" autoComplete="off" />
            </label>
            {typed !== expected && <p className="mt-1 text-xs text-muted">Adı aynen yazınca silme açılır.</p>}
            <ErrorBox error={remove.error} />
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary">Vazgeç</Button>
              </Dialog.Close>
              <Button variant="danger" disabled={typed !== expected || remove.isPending} onClick={() => remove.mutate()}>
                {remove.isPending ? 'Siliniyor…' : 'Kalıcı olarak sil'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
