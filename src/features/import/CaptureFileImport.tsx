import { useMutation, useQuery } from '@tanstack/react-query'
import { FileUp, ShieldAlert } from 'lucide-react'
import { useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import type { ContributionResult } from '../../api/types'
import { HelpPopover } from '../../components/ui'
import { Button, Segmented } from '../../design/components/primitives'
import { errorMessage } from '../../lib/errorMessage'
import { HarError, mergeRules, summarizeCaptures, type Capture, type CaptureMode, type HarResult, type ImportFileKind } from '../../lib/har/harCapture'
import { parseImportFile } from '../../lib/har/parseHarFile'

/** Katkı yüklemesi parça boyutu: uzantının CONTRIB yüklemesiyle aynı (4 MB). */
const CHUNK_BYTES = 4 * 1024 * 1024
const TARGETS: { id: CaptureMode; label: string }[] = [
  { id: 'PERSONAL', label: 'Kulübümü senkronla' },
  { id: 'CONTRIB', label: 'Bilgi tabanına katkı' },
]

interface SourceText {
  title: string
  help: { label: string; body: ReactNode }
  note: string
  drop: string
  hint: string
  accept: string
  inputLabel: string
  empty: string
}

/** Kaynağa göre değişen yalnız metinler; akış (hedef → ayrıştırma → özet → onay → gönderim) tek. */
const SOURCES: Record<ImportFileKind, SourceText> = {
  har: {
    title: 'HAR dosyasından içe aktar',
    help: {
      label: 'HAR nasıl alınır?',
      body: (
        <>
          <ol className="list-decimal space-y-1 pl-4">
            <li>EA FC Web App'i Chrome'da aç, F12 ile DevTools'u aç.</li>
            <li>Network sekmesinde "Preserve log" kutusunu işaretle.</li>
            <li>Web App'te SBC, Objectives ve Kulüp ekranlarını gez.</li>
            <li>Network'teki indirme simgesine bas → "Export HAR (sanitized)".</li>
            <li>Dosyayı buraya sürükle ya da seç.</li>
          </ol>
          <p className="mt-2">Firefox, Edge ve Safari'de de Network panelinde "HAR olarak kaydet" seçeneği vardır.</p>
        </>
      ),
    },
    note: 'Dosya tarayıcında işlenir, sunucuya yüklenmez. Başlıklar, çerezler ve gönderilen form verisi okunmaz; yalnız eşleşen yanıtlar, onayından sonra gönderilir.',
    drop: 'HAR dosyasını sürükle ya da seç',
    hint: '.har · en çok 150 MB',
    accept: '.har,application/json',
    inputLabel: 'HAR dosyası',
    empty: 'Dosyada işlenecek yanıt yok. Web App\'te ilgili ekranları "Preserve log" açıkken gezip yeniden dışa aktar.',
  },
  capture: {
    title: 'Yakalama dosyasından içe aktar',
    help: {
      label: 'Yakalama dosyası nasıl alınır?',
      body: (
        <ol className="list-decimal space-y-1 pl-4">
          <li>Uzantı açıkken Web App'te SBC, Objectives ve Kulüp ekranlarını gez.</li>
          <li>Uzantı penceresinde "Dışa aktar"a bas: fcareer-captures.json iner.</li>
          <li>Dosyayı buraya sürükle ya da seç.</li>
        </ol>
      ),
    },
    note: 'Dosya tarayıcında işlenir, sunucuya yüklenmez; yalnız eşleşen yanıtlar, onayından sonra gönderilir.',
    drop: 'Yakalama dosyasını sürükle ya da seç',
    hint: 'fcareer-captures.json · en çok 150 MB',
    accept: 'application/json,.json',
    inputLabel: 'Yakalama dosyası',
    empty: 'Dosyada işlenecek yanıt yok. Uzantı açıkken Web App\'te ilgili ekranları gezip yeniden dışa aktar.',
  },
}

function chunks(captures: Capture[]): Capture[][] {
  const out: Capture[][] = []
  let current: Capture[] = []
  let size = 0
  for (const c of captures) {
    const bytes = c.body.length + c.url.length + 64
    if (current.length > 0 && size + bytes > CHUNK_BYTES) {
      out.push(current)
      current = []
      size = 0
    }
    current.push(c)
    size += bytes
  }
  if (current.length > 0) {
    out.push(current)
  }
  return out
}

function contribError(error: unknown): string {
  if (error instanceof ApiError && error.status === 402) {
    return 'Bilgi tabanına katkı için katkıcı yetkisi gerekir.'
  }
  return errorMessage(error).message
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-3 flex items-baseline justify-between gap-2 px-3 py-2">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num text-base font-semibold">{value}</dd>
    </div>
  )
}

/**
 * Dosyadan içe aktarma (HAR-01 akışı, V3-05c-c ile ortak): HAR ya da uzantının "Dışa aktar" dosyası. Ham dosya sunucuya asla yüklenmez:
 * ayrıştırma tarayıcıda (Web Worker), aynı kural kaynağı ve süzgeçle (katkıda personalOnly hariç + stripFields); yalnız süzülmüş yakalama listesi,
 * yalnız kullanıcı özeti onaylayınca gider. Kişisel: POST /ut/capture (onPersonal → mevcut işleme hattı). Katkı: POST /ut/contrib/capture.
 */
export function CaptureFileImport({ source, onPersonal, busy }: { source: ImportFileKind; onPersonal: (captures: Capture[]) => void; busy: boolean }) {
  const text = SOURCES[source]
  const titleId = useId()
  const rulesQuery = useQuery({ queryKey: ['capture-rules'], queryFn: endpoints.captureRules, staleTime: 600_000, retry: false })
  const rules = useMemo(() => mergeRules(rulesQuery.data), [rulesQuery.data])
  const [mode, setMode] = useState<CaptureMode>('PERSONAL')
  const [file, setFile] = useState<File>()
  const [parsed, setParsed] = useState<HarResult>()
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string>()
  const [dragging, setDragging] = useState(false)

  const contribute = useMutation({
    mutationFn: async (captures: Capture[]) => {
      const total: ContributionResult = { created: 0, updated: 0, unchanged: 0, queued: 0, pricesRecorded: 0, pricesSkipped: 0 }
      for (const part of chunks(captures)) {
        const r = await endpoints.contribCapture(part)
        ;(Object.keys(total) as (keyof ContributionResult)[]).forEach((k) => (total[k] += r[k] ?? 0))
      }
      return total
    },
    onSuccess: () => setParsed(undefined),
  })

  // Dosya ya da hedef değişince yeniden ayrıştırılır (kişisel ve katkı süzgeçleri farklı); yalnız son istek sonucu yazar.
  const runId = useRef(0)
  function run(f: File | undefined, m: CaptureMode) {
    const id = ++runId.current
    contribute.reset()
    setParsed(undefined)
    setError(undefined)
    if (!f) {
      setParsing(false)
      return
    }
    setParsing(true)
    parseImportFile(f, source, m, rules)
      .then((result) => id === runId.current && setParsed(result))
      .catch((e: unknown) => id === runId.current && setError(e instanceof HarError ? e.message : 'Dosya okunamadı.'))
      .finally(() => id === runId.current && setParsing(false))
  }

  const summary = parsed ? summarizeCaptures(parsed.captures) : undefined
  const skipped = parsed ? parsed.skipped.total - parsed.captures.length : 0
  const pick = (f: File | undefined) => {
    setFile(f)
    run(f, mode)
  }
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files?.[0])
  }

  return (
    <section aria-labelledby={titleId} className="glass flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={titleId} className="font-display text-xl font-semibold leading-6">{text.title}</h2>
        <HelpPopover label={text.help.label}>{text.help.body}</HelpPopover>
      </div>
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />
        <span>Dosyayı kimseyle paylaşma; FC Assist yalnız gerekli yanıtları okur.</span>
      </p>
      <p className="text-xs text-muted">{text.note}</p>

      <Segmented label="Hedef" value={mode} options={TARGETS} onChange={(id) => { setMode(id); if (file) run(file, id); else contribute.reset() }} />

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`glass-3 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-4 text-center text-sm ${dragging ? 'ring-2 ring-accent' : ''}`}
      >
        <FileUp size={22} aria-hidden="true" className="text-accent" />
        <span className="font-semibold">{text.drop}</span>
        <span className="max-w-full truncate text-xs text-muted">{file ? file.name : text.hint}</span>
        <input type="file" accept={text.accept} aria-label={text.inputLabel} className="sr-only"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </label>

      {parsing && <p role="status" className="text-sm text-muted">Dosya okunuyor…</p>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}

      {parsed && summary && (
        <section aria-label="Gönderilmeden önce özet" className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-semibold leading-6">Gönderilmeden önce özet</h3>
          <dl className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
            <Row label="SBC seti" value={summary.sbcSets} />
            <Row label="SBC görevi" value={summary.sbcChallenges} />
            <Row label="Kulüp kartı" value={summary.clubCards} />
            <Row label="Fiyat gözlemi" value={summary.priceObservations} />
            <Row label="Objective" value={summary.objectives} />
            <Row label="Atlanan istek" value={skipped} />
          </dl>
          <p className="text-xs text-muted">
            {parsed.captures.length} yanıt gönderilecek · Hedef: {TARGETS.find((t) => t.id === mode)!.label}.
            {mode === 'CONTRIB' ? ' Kişisel uçlar (kulüp, transfer listesi…) alınmadı; satıcı/alıcı alanları silindi.' : ''}
          </p>
          {parsed.captures.length === 0 ? (
            <p role="alert" className="text-sm text-warn">{text.empty}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" disabled={busy || contribute.isPending}
                onClick={() => (mode === 'PERSONAL' ? (onPersonal(parsed.captures), setParsed(undefined)) : contribute.mutate(parsed.captures))}>
                Gönder
              </Button>
              <Button onClick={() => { setParsed(undefined); setFile(undefined) }}>Vazgeç</Button>
            </div>
          )}
        </section>
      )}

      {contribute.isPending && <p role="status" className="text-sm text-muted">Gönderiliyor…</p>}
      {contribute.isError && <p role="alert" className="text-sm text-bad">{contribError(contribute.error)}</p>}
      {contribute.data && (
        <p role="status" className="text-sm text-good">
          Katkı gönderildi: {contribute.data.created} yeni, {contribute.data.updated} güncellendi, {contribute.data.queued} onay sırasında, {contribute.data.pricesRecorded} fiyat gözlemi.
        </p>
      )}
    </section>
  )
}
