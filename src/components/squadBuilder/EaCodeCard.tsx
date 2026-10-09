import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import { tacticStore, toTacticRequest, useTactic } from '../../state/tacticStore'
import { Modal } from '../Modal'
import { ErrorBox, Input } from '../ui'

/** Kod her taktik değişiminde otomatik yeniden üretilir; elle üretme tuşu yok. */
export function EaCodeCard({ onImported }: { onImported?: () => void }) {
  const tactic = useTactic()
  const request = toTacticRequest(tactic)
  const exported = useQuery({
    queryKey: ['ea-code', JSON.stringify(request)],
    queryFn: () => endpoints.exportTacticCode(request),
    retry: false,
    staleTime: 300_000,
  })
  const [notice, setNotice] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const importCode = useMutation({
    mutationFn: () => endpoints.importTacticCode(input.trim()),
    onSuccess: (result) => {
      const slots: Record<string, { tags: string[]; roleId?: string }> = {}
      result.slots.forEach((s) => {
        slots[s.slotId] = { tags: [], roleId: s.roleId }
      })
      tacticStore.set({ formation: result.formation, slots, setup: { buildUp: result.buildUp as 'Short' | 'Balanced' | 'Counter', depth: result.depth } })
      onImported?.()
      setNotice(`Taktik yüklendi: ${result.formation} · ${result.buildUp} · Hat ${result.depth}.`)
    },
  })
  const [open, setOpen] = useState(false)
  const code = exported.data?.code

  async function copy() {
    if (!code) {
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setNotice('Kopyalandı.')
    } catch {
      setNotice('Kopyalanamadı; kodu elle seç.')
    }
  }

  return (
    <section className="rounded-md border border-line bg-surface p-3.5 text-ink">
      <h2 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent">EA Taktik Kodu</h2>
      <div aria-live="polite" className="rounded-[10px] border border-line bg-surface-2 p-3 text-center font-mono text-xl font-extrabold tracking-[3px] text-code">
        {code ?? (exported.isFetching ? '…' : '—')}
      </div>
      <div className="mt-2.5 flex gap-2">
        <button type="button" disabled={!code} onClick={copy} className="flex-1 rounded-md bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent disabled:opacity-50">
          Kopyala
        </button>
        <button type="button" disabled={!code} onClick={() => setOpen(true)} className="flex-1 rounded-md bg-surface-2 py-2 text-[12.5px] font-bold text-ink disabled:opacity-50">
          Oyuna Aktar
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-1.5 text-xs text-accent">
          {notice}
        </p>
      )}
      <ErrorBox error={exported.error} />
      <div className="mt-2.5 flex items-center gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır (12 karakter)" aria-label="EA taktik kodunu yapıştır" className="font-mono" maxLength={16} />
        <button type="button" disabled={input.trim().length === 0 || importCode.isPending} onClick={() => { setNotice(undefined); importCode.mutate() }} className="rounded-md bg-surface-2 px-3 py-2 text-[12.5px] font-bold text-ink disabled:opacity-50">
          {importCode.isPending ? 'Okunuyor…' : 'Yükle'}
        </button>
      </div>
      <ErrorBox error={importCode.error} />
      {importCode.data && importCode.data.warnings.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-code">
          {importCode.data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {exported.data && exported.data.warnings.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-code">
          {exported.data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {open && code && (
        <Modal title="Oyuna aktar" hint="Kodu oyunda içe aktar" onClose={() => setOpen(false)}>
          <div className="rounded-[10px] border border-line bg-surface-2 p-3 text-center font-mono text-2xl font-extrabold tracking-[3px] text-code">{code}</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-ink">
            <li>Kodu kopyala.</li>
            <li>Oyunda Takım Yönetimi → Taktikler → Kod Kullan bölümüne gir.</li>
            <li>Kodu yapıştır; büyük/küçük harf önemlidir.</li>
          </ol>
          <button type="button" onClick={copy} className="mt-4 w-full rounded-md bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent">
            Kopyala
          </button>
        </Modal>
      )}
    </section>
  )
}
