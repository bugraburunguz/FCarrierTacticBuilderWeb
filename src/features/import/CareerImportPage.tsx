import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Play, Upload } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { ImportSummary } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { CareerSelect } from '../../components/CareerSelect'
import { importWarningText } from '../../lib/importWarnings'
import { EXPORT_DONE_WINDOW } from '../../lib/leExport'
import { useActiveCareerId } from '../../state/careerStore'
import { ErrorAlert, PRIMARY_BUTTON } from '../account/AccountParts'
import { formatBytes, importChecks } from './importChecks'

/** Gelişmiş: log yerine ayrı CSV'ler (önceki ekranla aynı alanlar ve zorunluluklar). */
const FILES = [
  { key: 'players', label: 'players.csv', required: true },
  { key: 'teams', label: 'teams.csv', required: true },
  { key: 'teamplayerlinks', label: 'teamplayerlinks.csv', required: true },
  { key: 'leagueteamlinks', label: 'leagueteamlinks.csv', required: false },
  { key: 'leagues', label: 'leagues.csv', required: false },
  { key: 'playerloans', label: 'playerloans.csv', required: false },
] as const
/** LE script'i tek kaynak (WEB-BUG-25): public/ altındaki dosya, BASE_URL ile. */
const SCRIPT_URL = `${import.meta.env.BASE_URL}fc27_career_export.lua`

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="glass-2 flex min-w-0 flex-1 flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-on-accent">{n}</span>
        <span aria-hidden="true" className="text-accent">{icon}</span>
        <h3 className="font-display text-lg font-semibold leading-6">{title}</h3>
      </div>
      <div className="flex flex-col gap-2 text-sm text-ink-2">{children}</div>
    </li>
  )
}

/** Sürükle-bırak alanı: tıklama/Enter dosya seçer; dosya adı ve doğru boyut (KB/MB). */
function DropZone({ label, accept, file, onFile }: { label: string; accept: string; file?: File; onFile: (file?: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div>
      <div role="button" tabIndex={0} aria-label={label} onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]) }}
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border-2 border-dashed p-4 text-center text-sm ${over ? 'border-accent bg-[var(--glass-hover)]' : 'border-[var(--glass-border)]'}`}>
        <Upload size={20} aria-hidden="true" className="text-accent" />
        <span className="font-medium text-ink">{label}</span>
        {file ? <span className="text-ink-2">{file.name} · {formatBytes(file.size)}</span> : <span className="text-muted">Dosyayı buraya bırak ya da tıklayıp seç</span>}
      </div>
      <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  )
}

/**
 * Kariyer içe aktarma v3 (V3-07a, 08 §11): 1 Script indir → 2 LE'de çalıştır → 3 Dosyayı sürükle; yükleme ilerlemesi, tablo bazlı doğrulama sonucu,
 * gerekirse takımı seçip kadroyu kur. Uçlar ve doğrulamalar önceki ekranla aynı (importCareer, careerTeams, syncSquad); yalnız arayüz değişti.
 * İlerleme belirsiz (indeterminate): istemci fetch ile gönderir, bayt ilerlemesi ölçülmez.
 */
export function CareerImportPage() {
  const { me } = useAuth()
  const premium = me?.subscriptionType === 'PREMIUM'
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const teamListId = useId()
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [logFile, setLogFile] = useState<File>()
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [term, setTerm] = useState('')
  const [teamId, setTeamId] = useState<number>()

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      if (logFile) {
        form.append('log', logFile)
      } else {
        FILES.forEach((f) => files[f.key] && form.append(f.key, files[f.key]!))
      }
      return endpoints.importCareer(careerId!, form)
    },
    onSuccess: async (summary) => {
      setResult(summary)
      setTeamId(summary.guessedTeamId)
      await queryClient.invalidateQueries({ queryKey: ['squad'] })
      await queryClient.invalidateQueries({ queryKey: ['career-moves'] })
    },
  })
  const teams = useQuery({ queryKey: ['career-teams', careerId, term], queryFn: () => endpoints.careerTeams(careerId!, term), enabled: careerId !== undefined && result !== null })
  const sync = useMutation({ mutationFn: () => endpoints.syncSquad(careerId!, teamId!), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['squad'] }) })
  const ready = !!logFile || FILES.filter((f) => f.required).every((f) => files[f.key])

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Kariyer verisini içe aktar</h1>
        <p className="text-sm text-ink-2">Oyundaki gerçek veri: güncel OVR, gerçek potansiyel, serbest oyuncular ve tüm takımlar. Sezon sonunda tekrarla; veriler yalnız sana özel kalır.</p>
        {!premium && <p className="text-sm">Bu özellik PREMIUM'dur. <Link to="/profile" className="font-semibold text-accent underline-offset-2 hover:underline">PREMIUM'a geç</Link></p>}
      </header>

      <ol aria-label="Adımlar" className="flex flex-col gap-3 min-[900px]:flex-row">
        <Step n={1} icon={<Download size={18} />} title="Script indir">
          <p>Dışa aktarma script'i yalnızca okur; oyun verini değiştirmez.</p>
          <a href={SCRIPT_URL} download className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-[var(--radius-sm)] bg-accent px-3 text-sm font-semibold text-on-accent hover:opacity-90 max-sm:min-h-11">
            <Download size={16} aria-hidden="true" />Script'i indir (fc27_career_export.lua)
          </a>
        </Step>
        <Step n={2} icon={<Play size={18} />} title="LE'de çalıştır">
          <p>Oyunda kariyerini yükle ve kariyer ana ekranında kal. Live Editor'de Lua Engine'den script'i çalıştır.</p>
          <p>Bitince "{EXPORT_DONE_WINDOW}" penceresi çıkar. Veri Live Editor klasörü → Logs → <code>live_editor_&lt;tarih&gt;.log</code> dosyasına yazılır.</p>
        </Step>
        <Step n={3} icon={<Upload size={18} />} title="Dosyayı sürükle">
          <p>.log dosyasını aşağıdaki alana bırak ve Yükle'ye bas. Kadron oyundaki gerçek kadrondan kurulur.</p>
        </Step>
      </ol>

      <section aria-label="Yükleme" className="glass flex flex-col gap-3 p-4">
        <CareerSelect />
        <DropZone label="Live Editor log dosyasını sürükle" accept=".log,.txt" file={logFile} onFile={setLogFile} />
        <details className="text-sm">
          <summary className="min-h-8 cursor-pointer font-semibold text-accent max-sm:min-h-11">Gelişmiş: log yerine ayrı CSV dosyaları</summary>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FILES.map((f) => <DropZone key={f.key} label={`${f.label}${f.required ? ' (zorunlu)' : ' (isteğe bağlı)'}`} accept=".csv" file={files[f.key]} onFile={(file) => setFiles((p) => ({ ...p, [f.key]: file }))} />)}
          </div>
        </details>
        {upload.isPending && (
          <div role="progressbar" aria-label="Yükleniyor" className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-3)]">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
          </div>
        )}
        <ErrorAlert error={upload.error} />
        <button type="button" disabled={!premium || !ready || careerId === undefined || upload.isPending} onClick={() => upload.mutate()} className={`${PRIMARY_BUTTON} sm:w-auto sm:self-start`}>
          {upload.isPending ? 'Yükleniyor…' : 'Yükle'}
        </button>
      </section>

      {result && (
        <section aria-label="Sonuç" className="glass-2 flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-semibold leading-6">Doğrulama</h2>
          <table className="w-full max-w-xl text-sm">
            <caption className="sr-only">Doğrulama sonucu</caption>
            <thead className="text-xs text-muted"><tr><th scope="col" className="py-1 text-left font-medium">Tablo</th><th scope="col" className="py-1 text-left font-medium">Sonuç</th><th scope="col" className="py-1 text-right font-medium"><span className="sr-only">Durum</span></th></tr></thead>
            <tbody>
              {importChecks(result).map((row) => (
                <tr key={row.label} className="border-t border-[var(--glass-border)]">
                  <td className="py-1.5 font-[var(--font-num)]">{row.label}</td>
                  <td className="py-1.5">{row.value}</td>
                  <td className="py-1.5 text-right">{row.ok
                    ? <span className="font-semibold text-good">✓</span>
                    : <span className="font-semibold text-bad">✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-2">{result.freeAgents.toLocaleString('tr-TR')} serbest oyuncu{result.generatedPlayers ? ` · ${result.generatedPlayers} kariyerde üretilmiş oyuncu (yalnız bu kariyerde)` : ''}{result.unmatchedPlayers > 0 ? ` · ${result.unmatchedPlayers} oyuncu katalogda yok, atlandı` : ''}.</p>
          {(result.warnings ?? []).map((code) => <p key={code} role="alert" className="text-sm text-bad">{importWarningText(code, result)}</p>)}
          <div className="flex flex-col gap-2">
            <label htmlFor={teamListId} className="text-xs font-medium text-ink-2">Takım farklıysa ara ve kadroyu o takımdan kur</label>
            <input id={teamListId} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Takım ara…" className="glass-3 min-h-10 max-w-md rounded-[var(--radius-sm)] px-3 text-sm max-sm:min-h-11" />
            <ul className="max-h-48 overflow-y-auto text-sm">
              {(teams.data ?? []).map((t) => (
                <li key={t.teamId}>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 max-sm:min-h-11">
                    <input type="radio" name="team" checked={teamId === t.teamId} onChange={() => setTeamId(t.teamId)} />
                    {t.name} <span className="text-xs text-ink-2">{t.league} · {t.overall ?? '—'} · {t.playerCount} oyuncu</span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" disabled={teamId === undefined || sync.isPending} onClick={() => sync.mutate()} className="glass-3 inline-flex min-h-10 items-center self-start rounded-[var(--radius-sm)] px-3 text-sm font-semibold hover:bg-[var(--glass-hover)] max-sm:min-h-11">
              {sync.isPending ? 'Kuruluyor…' : 'Kadroyu bu takımdan kur'}
            </button>
            <ErrorAlert error={sync.error} />
            {sync.data && <p className="text-sm text-good">{sync.data.players} oyuncuyla kadro kuruldu. <Link to="/career/desk" className="font-semibold underline">Masaya git</Link></p>}
          </div>
        </section>
      )}
    </div>
  )
}
