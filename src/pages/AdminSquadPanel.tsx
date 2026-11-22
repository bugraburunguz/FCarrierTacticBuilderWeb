import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { BaseImportResult } from '../api/types'
import { Button, Card, EmptyState, Field, Input, Pill } from '../components/ui'
import { formatSquadVersion, squadVersionKeys, squadVersionsQuery } from '../features/career/squadVersion'
import { errorMessage } from '../lib/errorMessage'
import { gzipFile } from '../lib/leLogTrim'

type Step = 'idle' | 'confirm' | 'compressing' | 'uploading'

const STEP_TEXT: Partial<Record<Step, string>> = { compressing: 'Sıkıştırılıyor…', uploading: 'Yükleniyor…' }
const CONFIRM_TEXT = 'Yeni kadro sürümü açılır; mevcut kariyerler eski sürümde kalır.'
const count = (value: number) => value.toLocaleString('tr-TR')

async function isGzip(file: File): Promise<boolean> {
  if (file.name.toLowerCase().endsWith('.gz')) {
    return true
  }
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  return head[0] === 0x1f && head[1] === 0x8b
}

export function AdminSquadPanel() {
  const client = useQueryClient()
  const versions = useQuery(squadVersionsQuery)
  const [file, setFile] = useState<File>()
  const [label, setLabel] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const upload = useMutation({
    mutationFn: async ({ log, name }: { log: File; name: string }) => {
      const compressed = await isGzip(log)
      if (!compressed) {
        setStep('compressing')
      }
      const body = compressed ? log : await gzipFile(log)
      setStep('uploading')
      const form = new FormData()
      form.append('log', body)
      if (name) {
        form.append('label', name)
      }
      return endpoints.importBaseSquad(form)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: squadVersionKeys.all }),
    onSettled: () => setStep('idle'),
  })
  const busy = upload.isPending || step === 'compressing' || step === 'uploading'

  function startUpload() {
    if (!file) {
      return
    }
    setStep('uploading')
    upload.mutate({ log: file, name: label.trim() })
  }

  return (
    <div className="space-y-4">
      <Card title="Kadro yükle">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Log dosyası">
            <input type="file" accept=".log,.txt,.gz" disabled={busy}
              onChange={(e) => { setFile(e.target.files?.[0]); setStep('idle'); upload.reset() }}
              className="block w-full min-w-0 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-sm file:font-semibold file:text-ink" />
          </Field>
          <Field label="Etiket (isteğe bağlı)">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} maxLength={120} />
          </Field>
        </div>
        {step === 'confirm' ? (
          <div className="mt-3 rounded-md border border-line bg-surface-2 p-3">
            <p className="text-sm text-ink">{CONFIRM_TEXT}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={startUpload}className="min-h-11 sm:min-h-0">Onayla</Button>
              <Button variant="secondary" onClick={() => setStep('idle')} className="min-h-11 sm:min-h-0">Vazgeç</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3 min-h-11 sm:min-h-0" disabled={!file || busy} onClick={() => { upload.reset(); setStep('confirm') }}>Yükle</Button>
        )}
        <div aria-live="polite" className="mt-3 space-y-2 text-sm">
          {busy && STEP_TEXT[step] && <p className="text-muted">{STEP_TEXT[step]}</p>}
          {upload.isError && <p className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-danger">{errorMessage(upload.error).message}</p>}
          {upload.data && <ImportSummary result={upload.data} />}
        </div>
      </Card>
      <Card title="Kadro sürümleri">
        {versions.isPending ? <p className="text-sm text-muted">Sürümler yükleniyor…</p>
          : versions.isError ? <p className="text-sm text-danger">Kadro sürümleri alınamadı.</p>
          : versions.data.length === 0 ? <EmptyState>Henüz kadro sürümü yok.</EmptyState>
          : (
            <ul aria-label="Kadro sürümleri" className="divide-y divide-line text-sm">
              {versions.data.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 break-words">
                    <span className="num text-muted">{`Sürüm ${v.versionNo}`}</span>{' · '}{formatSquadVersion(v)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num text-xs text-muted">{`${count(v.playerCount)} oyuncu`}</span>
                    {v.latest && <Pill tone="emerald">En yeni</Pill>}
                  </span>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  )
}

function ImportSummary({ result }: { result: BaseImportResult }) {
  const stats: [string, number][] = [
    ['Arşivlenen oyuncu', result.archivedPlayers],
    ['Eklenen', result.created],
    ['Güncellenen', result.updated],
  ]
  return (
    <section aria-label="Yükleme sonucu" className="rounded-md border border-line bg-surface-2 p-3">
      <p className="font-semibold text-ink">
        {result.squadVersionId === null ? 'Değişiklik yok; yeni sürüm açılmadı.' : `Sürüm ${result.squadVersionNo ?? ''} açıldı.`}
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-2">
        {stats.map(([name, value]) => (
          <div key={name}>
            <dt className="text-xs text-muted">{name}</dt>
            <dd className="num text-base font-semibold text-ink">{count(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
