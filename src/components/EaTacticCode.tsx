import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import { toTacticRequest, tacticStore, useTactic } from '../state/tacticStore'
import { Button, Card, ErrorBox, Input, Pill } from './ui'

export function EaTacticCode({ onLoaded }: { onLoaded: () => void }) {
  const tactic = useTactic()
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState<string | undefined>()

  const request = toTacticRequest(tactic)
  const exportCode = useQuery({
    queryKey: ['ea-code', JSON.stringify(request)],
    queryFn: () => endpoints.exportTacticCode(request),
    retry: false,
    staleTime: 300_000,
  })
  const importCode = useMutation({
    mutationFn: () => endpoints.importTacticCode(input.trim()),
    onSuccess: (result) => {
      const slots: Record<string, { tags: string[]; roleId?: string }> = {}
      result.slots.forEach((s) => {
        slots[s.slotId] = { tags: [], roleId: s.roleId }
      })
      tacticStore.set({ formation: result.formation, slots, setup: { buildUp: result.buildUp as 'Short' | 'Balanced' | 'Counter', depth: result.depth } })
      onLoaded()
      setNotice(`Taktik yüklendi: ${result.formation} · ${result.buildUp} · Hat yüksekliği ${result.depth}.`)
    },
  })

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setNotice('Kod panoya kopyalandı.')
    } catch {
      setNotice('Kopyalanamadı; kodu elle seç.')
    }
  }

  const exported = exportCode.data
  return (
    <Card title="EA taktik kodu" actions={<Pill tone="emerald">Ücretsiz</Pill>}>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">{exportCode.isFetching ? 'Kod üretiliyor…' : 'Kod taktik değiştikçe otomatik güncellenir.'}</p>
          {exported && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <Input readOnly value={exported.code} aria-label="EA taktik kodu" onFocus={(e) => e.currentTarget.select()} className="font-mono" />
                <Button variant="secondary" onClick={() => copy(exported.code)}>Kopyala</Button>
              </div>
              <p className="text-xs text-slate-500">
                Oyunda: Takım Yönetimi → Taktikler → <b>Kod Kullan</b>. Formasyon {exported.formation}; Build-Up ve hat yüksekliği Takım ayarlarından alındı.
              </p>
              {exported.warnings.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700 dark:text-amber-400">
                  {exported.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <ErrorBox error={exportCode.error} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır (12 karakter)" aria-label="EA taktik kodunu yapıştır" className="font-mono" maxLength={16} />
            <Button disabled={input.trim().length === 0 || importCode.isPending} onClick={() => { setNotice(undefined); importCode.mutate() }}>
              {importCode.isPending ? 'Okunuyor…' : 'Yükle'}
            </Button>
          </div>
          <ErrorBox error={importCode.error} />
          {importCode.data && importCode.data.warnings.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-700 dark:text-amber-400">
              {importCode.data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
        {notice && (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Kod, EA'nın oyun içi paylaşım kodudur (Build-Up, hat yüksekliği ve 11 oyuncunun rol + odağı). Büyük/küçük harf önemlidir. Davranış etiketleri koda girmez; yüklenen taktikte etiketler boş gelir.
        </p>
      </div>
    </Card>
  )
}
