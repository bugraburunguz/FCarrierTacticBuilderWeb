import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, request, requestText } from '../api/client'
import type { GrowthReport } from '../api/types'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Pill } from '../components/ui'

const DIMENSIONS: { id: string; label: string }[] = [
  { id: 'age', label: 'Yaş' },
  { id: 'play', label: 'Oynama' },
  { id: 'agePlay', label: 'Yaş × oynama' },
  { id: 'headroom', label: 'Gençlerde POT−OVR' },
]
const PLAY: Record<string, string> = { NONE: 'Oynamadı', LOW: 'Az', REGULAR: 'Düzenli', UNKNOWN: 'Bilinmiyor' }

/** Oynama kovası anahtarı Türkçe ("≤19 · REGULAR" → "≤19 · Düzenli"); diğer anahtarlar olduğu gibi. */
const groupLabel = (key: string) => key.split(' · ').map((part) => PLAY[part] ?? part).join(' · ')
const num = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 }).replace('-', '−')

interface Params {
  career: string
  from: string
  to: string
}

/**
 * GTR-b: Gelişim ölçümü (yalnız ADMIN). Kariyer kimliği ve iki oyun tarihi; GET /admin/careers/{id}/growth-report → sade tablo (grafik yok) ve aynı
 * aralıkla CSV indirme. Tarih boşsa sunucu ilk/son anlık görüntüyü alır. Aralıkta iki görüntü yoksa 404 → açık mesaj.
 */
export function AdminGrowthPanel() {
  const [form, setForm] = useState<Params>({ career: '', from: '', to: '' })
  const [params, setParams] = useState<Params>()
  const path = params && `/admin/careers/${params.career}/growth-report`
  const query = params && { from: params.from || undefined, to: params.to || undefined }
  const report = useQuery({ queryKey: ['admin-growth-report', params], queryFn: () => request<GrowthReport>(path!, { query }), enabled: !!params, retry: false })
  const csv = useMutation({
    mutationFn: () => requestText(path!, { query: { ...query, format: 'csv' } }),
    onSuccess: (text) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `gelisim-olcumu-${params!.career}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  const missing = report.error instanceof ApiError && report.error.status === 404
  const set = (key: keyof Params) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const data = report.data

  return (
    <div className="space-y-4">
      <Card title="Gelişim ölçümü">
        <form className="grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end"
          onSubmit={(e) => { e.preventDefault(); setParams({ ...form }) }}>
          <Field label="Kariyer kimliği"><Input type="number" min={1} inputMode="numeric" value={form.career} onChange={set('career')} /></Field>
          <Field label="Başlangıç (oyun tarihi)"><Input type="date" value={form.from} onChange={set('from')} /></Field>
          <Field label="Bitiş (oyun tarihi)"><Input type="date" value={form.to} onChange={set('to')} /></Field>
          <Button type="submit" disabled={!/^\d+$/.test(form.career)}>Raporu getir</Button>
        </form>
        <p className="mt-2 text-xs text-muted">Tarih boşsa ilk ya da son anlık görüntü alınır. Gerçek değişim, modelin plansız tahminiyle kıyaslanır.</p>
      </Card>
      {params && (
        <Card title="Rapor">
          {report.isLoading ? <p role="status" className="text-sm text-muted">Yükleniyor…</p>
            : missing ? <EmptyState>Bu aralıkta iki anlık görüntü yok; tarihleri genişlet.</EmptyState>
            : report.error ? <ErrorBox error={report.error} />
            : data && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">{`${data.from} → ${data.to} · ${data.days} gün · ${data.matched} oyuncu eşleşti`}</p>
                  <span className="flex items-center gap-2">
                    {data.partial && <Pill tone="amber">Kısmi dönem (365 günden kısa)</Pill>}
                    <Button variant="secondary" onClick={() => csv.mutate()} disabled={csv.isPending}>CSV indir</Button>
                  </span>
                </div>
                <ErrorBox error={csv.error} />
                {/* Dar ekranda yatay kaydırılır; klavyeyle de kaydırılabilsin diye odaklanabilir bölge. */}
                <div role="region" aria-label="Gelişim ölçümü tablosu" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                  <table aria-label="Gelişim ölçümü" className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted">
                      <tr>
                        <th className="py-1">Boyut</th><th>Grup</th><th className="text-right">n</th><th className="text-right">Ort. OVR Δ</th><th className="text-right">Medyan</th>
                        <th className="text-right">Tahmin</th><th className="text-right">Fark</th><th className="text-right">Fiziksel</th><th className="text-right">Teknik</th><th className="text-right">Zihinsel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DIMENSIONS.flatMap((d) => (data.groups[d.id] ?? []).map((g) => (
                        <tr key={`${d.id}-${g.key}`} className="border-t border-line">
                          <td className="py-1">{d.label}</td><td>{groupLabel(g.key)}</td><td className="num text-right">{g.n}</td>
                          <td className="num text-right">{num(g.meanOverallDelta)}</td><td className="num text-right">{num(g.medianOverallDelta)}</td>
                          <td className="num text-right">{num(g.meanPredicted)}</td><td className="num text-right">{num(g.meanDiff)}</td>
                          <td className="num text-right">{num(g.physical)}</td><td className="num text-right">{num(g.technical)}</td><td className="num text-right">{num(g.mental)}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </Card>
      )}
    </div>
  )
}
