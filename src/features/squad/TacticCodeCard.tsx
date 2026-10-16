import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { ResolvedTactic, TacticCodeImport, TacticRequest } from '../../api/types'
import { ExportWarnings } from '../../components/ExportWarnings'
import { ErrorBox, Input } from '../../components/ui'
import { AppDialog } from '../../design/components/AppDialog'
import type { SquadMode } from './types'

const PANEL = 'rounded-md border border-line bg-surface p-3.5 text-ink'
const PANEL_TITLE = 'mb-2.5 border-b border-line pb-1.5 font-display text-lg font-bold uppercase tracking-wide'
const COPIED_MS = 1500

/**
 * EA taktik kodu: iki modun tek bileşeni (eski UtTacticCode + EaCodeCard). Çözülmüş taktik üst bileşendeki TEK sorgudan gelir;
 * kod her taktik değişiminde otomatik üretilir, elle üretme tuşu yok.
 */
export function TacticCodeCard({ mode, tactic, resolved, onLoaded }: { mode: SquadMode; tactic: TacticRequest; resolved: ResolvedTactic | undefined; onLoaded: (r: TacticCodeImport) => void }) {
  const exportRequest: TacticRequest | undefined = resolved
    ? { ...tactic, slots: resolved.slots.map((s) => ({ slotId: s.slotId, tags: tactic.slots.find((t) => t.slotId === s.slotId)?.tags ?? [], roleId: s.roleId })) }
    : undefined
  const exported = useQuery({
    queryKey: ['tactic-code', JSON.stringify(exportRequest)],
    queryFn: () => endpoints.exportTacticCode(exportRequest!),
    enabled: Boolean(exportRequest),
    retry: false,
    staleTime: 300_000,
  })
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState<string>()
  const [open, setOpen] = useState(false)
  const importCode = useMutation({
    mutationFn: () => endpoints.importTacticCode(input.trim()),
    onSuccess: (result) => {
      onLoaded(result)
      setNotice(`Taktik yüklendi: ${result.formation} · ${result.buildUp} · Hat ${result.depth}.`)
    },
  })
  const code = exported.data?.code

  async function copy() {
    if (!code) {
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setNotice('Kopyalandı.')
      setTimeout(() => setNotice((cur) => (cur === 'Kopyalandı.' ? undefined : cur)), COPIED_MS)
    } catch {
      setNotice('Kopyalanamadı; kodu elle seç.')
    }
  }

  return (
    <section className={PANEL}>
      <h2 className={PANEL_TITLE}>EA Taktik Kodu</h2>
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
      <p className="mt-1.5 text-xs text-muted">Kod formasyon, rol, Build-Up ve hat değiştikçe otomatik güncellenir.</p>
      {notice && <p role="status" className="mt-1.5 text-xs text-accent">{notice}</p>}
      <ExportWarnings warnings={exported.data?.warnings} />
      <ErrorBox error={exported.error} />
      <div className="mt-2.5 flex items-center gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır" className="font-mono" maxLength={16} aria-label="EA kodunu yapıştır" />
        <button type="button" disabled={!input.trim() || importCode.isPending} onClick={() => { setNotice(undefined); importCode.mutate() }} className="rounded-md bg-surface-2 px-3 py-2 text-[12.5px] font-bold text-ink disabled:opacity-50">
          {importCode.isPending ? 'Okunuyor…' : 'Yükle'}
        </button>
      </div>
      <ErrorBox error={importCode.error} />
      <ExportWarnings warnings={importCode.data?.warnings} title="Kod sitede tam karşılanmadı" />
      <p className="mt-1.5 text-xs text-muted">
        Kod mod-bağımsızdır: UT ve kariyerde aynı kod. Yüklemek formasyonu, rolleri, Build-Up'ı ve hattı değiştirir{mode === 'ut' ? ', kartları temizler' : '; oyuncu atamaların kalır'}.
      </p>
      {open && code && (
        <AppDialog title="Oyuna aktar" hint="Kodu oyunda içe aktar" onClose={() => setOpen(false)}>
          <div className="rounded-[10px] border border-line bg-surface-2 p-3 text-center font-mono text-2xl font-extrabold tracking-[3px] text-code">{code}</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-ink">
            <li>Kodu kopyala.</li>
            <li>Oyunda Takım Yönetimi → Taktikler → Kod Kullan bölümüne gir.</li>
            <li>Kodu yapıştır; büyük/küçük harf önemlidir.</li>
          </ol>
          <button type="button" onClick={copy} className="mt-4 w-full rounded-md bg-accent-bg py-2 text-[12.5px] font-bold text-on-accent">Kopyala</button>
        </AppDialog>
      )}
    </section>
  )
}
