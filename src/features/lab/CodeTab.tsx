import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../../api/endpoints'
import type { UserTactic } from '../../api/types'
import { ExportWarnings } from '../../components/ExportWarnings'
import { ErrorBox, Input } from '../../components/ui'
import { Button, EmptyState, Panel, Segmented } from '../../design/components/primitives'
import { toTacticRequest } from '../../lib/tactic'
import { labStore, type Draft } from '../../state/labStore'
import { tacticFromCode } from './labSources'

type Source = 'draft' | 'main'

/**
 * Lab › Kod (KARIYER-UX FAZ 4b, 15 §4.3): dışa aktar — aktif taslağın EA kodu (TacticCodeService.export) ya da ana taktiğin saklı kodu (`eaCode`);
 * içe aktar — EA kodu yeni taslak açar (`origin: code`). Eski tek kopya depo kullanılmaz (EaTacticCode'un yerine).
 */
export function CodeTab({ careerId, draft, main, onCreated }: { careerId: number; draft?: Draft; main?: UserTactic | null; onCreated: () => void }) {
  const [source, setSource] = useState<Source>(draft ? 'draft' : 'main')
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState<string>()
  const request = draft ? toTacticRequest(draft.tactic) : undefined
  const exported = useQuery({
    queryKey: ['tactic-code', 'lab', JSON.stringify(request)],
    queryFn: () => endpoints.exportTacticCode(request!),
    enabled: source === 'draft' && request !== undefined,
    retry: false,
    staleTime: 300_000,
  })
  const importCode = useMutation({
    mutationFn: () => endpoints.importTacticCode(input.trim()),
    onSuccess: (result) => {
      const created = labStore.create(careerId, { name: `Kod · ${result.formation}`, origin: { kind: 'code' }, tactic: tacticFromCode(result), lineup: {} })
      if (!created.ok) {
        setNotice(created.message)
        return
      }
      setInput('')
      onCreated()
    },
  })
  const code = source === 'draft' ? exported.data?.code : main?.eaCode ?? undefined

  async function copy() {
    if (!code) {
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setNotice('Kod panoya kopyalandı.')
    } catch {
      setNotice('Kopyalanamadı; kodu elle seç.')
    }
  }

  const options = [
    ...(draft ? [{ id: 'draft' as const, label: 'Aktif taslak' }] : []),
    ...(main ? [{ id: 'main' as const, label: 'Ana taktik' }] : []),
  ]
  return (
    <div className="grid grid-cols-1 gap-3 min-[1024px]:grid-cols-2">
      <Panel title="Dışa aktar" label="Dışa aktar">
        {options.length === 0 ? <EmptyState>Dışa aktaracak taslak ya da ana taktik yok.</EmptyState> : (
          <div className="flex flex-col gap-3">
            <Segmented label="Kaynak" value={source} options={options} onChange={setSource} />
            {source === 'draft' && exported.isFetching && <p className="text-xs text-muted">Kod üretiliyor…</p>}
            {code && (
              <div className="flex items-center gap-2">
                <Input readOnly value={code} aria-label="EA taktik kodu" onFocus={(e) => e.currentTarget.select()} className="font-mono" />
                <Button onClick={copy}>Kopyala</Button>
              </div>
            )}
            <p className="text-xs text-ink-2">Oyunda: Takım Yönetimi → Taktikler → <b>Kod Kullan</b>.</p>
            {source === 'draft' && <ExportWarnings warnings={exported.data?.warnings} />}
            <ErrorBox error={source === 'draft' ? exported.error : undefined} />
          </div>
        )}
      </Panel>
      <Panel title="İçe aktar" label="İçe aktar">
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault()
          if (input.trim()) {
            importCode.mutate()
          }
        }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} aria-label="EA kodunu yapıştır" placeholder="EA kodunu yapıştır" className="font-mono" />
          <span><Button type="submit" variant="primary" disabled={!input.trim() || importCode.isPending}>Taslak olarak aç</Button></span>
          <p className="text-xs text-ink-2">Kod yeni bir taslak olarak açılır; mevcut taslaklar değişmez.</p>
          <ErrorBox error={importCode.error} />
        </form>
      </Panel>
      {notice && <p role="status" className="text-sm text-ink-2 min-[1024px]:col-span-2">{notice}</p>}
    </div>
  )
}
