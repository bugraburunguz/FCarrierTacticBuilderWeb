import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { ImportSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { CareerSelect } from '../components/CareerSelect'
import { Button, Card, ErrorBox, Field, Input, Pill } from '../components/ui'
import { useActiveCareerId } from '../state/careerStore'

const FILES = [
  { key: 'players', label: 'players.csv', required: true },
  { key: 'teams', label: 'teams.csv', required: true },
  { key: 'teamplayerlinks', label: 'teamplayerlinks.csv', required: true },
  { key: 'leagueteamlinks', label: 'leagueteamlinks.csv', required: false },
  { key: 'leagues', label: 'leagues.csv', required: false },
] as const

const STEPS = [
  'Oyunu aç ve KARİYERİNİ yükle. Kariyerin içindeyken (ana menüde değil, kariyer ana ekranında) kal.',
  'Live Editor’ü başlat. Oyun açıkken Live Editor penceresinde “Lua Engine” sekmesine gir.',
  'Aşağıdaki “Script’i indir” ile fc27_career_export.lua dosyasını indir, Live Editor’ün Lua Engine bölümünden bu dosyayı seçip çalıştır.',
  'İşlem bitince “Dışa aktarım bitti” penceresi çıkar. Script masaüstünde “careerexport” klasörünü kendisi oluşturur (zaten varsa dokunmaz) ve 5 küçük .csv dosyasını oraya yazar. Masaüstüne yazamazsa C:\\FC 27 Live Editor\\export\\ klasörünü kullanır; hangisi olduğu bitiş penceresinde yazar.',
  'Aşağıdaki kutulara bu dosyaları sürükleyip bırak (ya da seç) ve “Yükle”ye bas. Yükleme birkaç saniye sürer.',
  'Yükleme bitince takımını seç; kadron oyundaki gerçek kadronla (güncel overall ve potential dahil) kurulur.',
]

export function ImportPage() {
  const { me } = useAuth()
  const premium = me?.subscriptionType === 'PREMIUM'
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [term, setTerm] = useState('')
  const [teamId, setTeamId] = useState<number | undefined>()

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      FILES.forEach((f) => {
        const file = files[f.key]
        if (file) {
          form.append(f.key, file)
        }
      })
      return endpoints.importCareer(careerId!, form)
    },
    onSuccess: async (summary) => {
      setResult(summary)
      setTeamId(summary.guessedTeamId)
      await queryClient.invalidateQueries({ queryKey: ['squad'] })
    },
  })
  const teams = useQuery({
    queryKey: ['career-teams', careerId, term],
    queryFn: () => endpoints.careerTeams(careerId!, term),
    enabled: careerId !== undefined && result !== null,
  })
  const sync = useMutation({
    mutationFn: () => endpoints.syncSquad(careerId!, teamId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['squad'] }),
  })
  const ready = FILES.filter((f) => f.required).every((f) => files[f.key])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card title="Kariyer verisini içe aktar" actions={<Pill tone="amber">PREMIUM</Pill>}>
        <p className="text-sm">
          Oyundaki gerçek veriyi aktar: güncel overall, <strong>gerçek potential</strong>, serbest oyuncular ve tüm takımların profili. Sezon sonunda oyuncuların overall’ı değişince aynı adımları tekrarlaman yeterli; veriler güncellenir.
          Veriler yalnızca sana özel kalır.
        </p>
        {!premium && (
          <p className="mt-2 text-sm">
            Bu özellik PREMIUM’dur. <Link to="/profile" className="text-emerald-700 underline">PREMIUM’a geç</Link>.
          </p>
        )}
      </Card>

      <Card title="Adım adım">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a href="/fc27_career_export.lua" download className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Script’i indir (fc27_career_export.lua)
          </a>
          <span className="text-xs text-slate-500">Script yalnızca okur; oyun verini değiştirmez.</span>
        </div>
      </Card>

      <Card title="Dosyaları yükle">
        <CareerSelect />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {FILES.map((f) => (
            <Field key={f.key} label={`${f.label}${f.required ? ' *' : ' (isteğe bağlı)'}`}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dropped = e.dataTransfer.files[0]
                  if (dropped) {
                    setFiles((prev) => ({ ...prev, [f.key]: dropped }))
                  }
                }}
                className="rounded-xl border-2 border-dashed border-slate-300 p-2 text-xs dark:border-slate-600"
              >
                <input
                  type="file"
                  accept=".csv"
                  aria-label={f.label}
                  className="w-full text-xs"
                  onChange={(e) => setFiles((prev) => ({ ...prev, [f.key]: e.target.files?.[0] }))}
                />
                {files[f.key] && <div className="mt-1 text-emerald-700">✓ {files[f.key]!.name}</div>}
              </div>
            </Field>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">leagueteamlinks ve leagues dosyaları milli takımları ayıklamak için gerekir; eklemeni öneririz.</p>
        <Button className="mt-3" disabled={!premium || !ready || careerId === undefined || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? 'Yükleniyor…' : 'Yükle'}
        </Button>
        <ErrorBox error={upload.error} />
      </Card>

      {result && (
        <Card title="Yükleme tamamlandı">
          <p className="text-sm">
            {result.players} oyuncu, {result.teams} takım içe aktarıldı · <strong>{result.freeAgents} serbest oyuncu</strong> bulundu.
            {result.unmatchedPlayers > 0 && ` (${result.unmatchedPlayers} oyuncu kataloğumuzda yok, atlandı.)`}
          </p>
          <div className="mt-3 space-y-2">
            <Field label="Takımını seç (kadron buradan kurulacak)">
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Takım ara…" />
            </Field>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {(teams.data ?? []).map((t) => (
                <li key={t.teamId}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="team" checked={teamId === t.teamId} onChange={() => setTeamId(t.teamId)} />
                    {t.name} <span className="text-xs text-slate-500">{t.league} · {t.overall ?? '—'} · {t.playerCount} oyuncu</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button disabled={teamId === undefined || sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending ? 'Kuruluyor…' : 'Kadroyu bu takımdan kur'}
            </Button>
            <p className="text-xs text-slate-500">Mevcut kadron bu takımın gerçek kadrosuyla değiştirilir (işlem geçmişin korunur).</p>
            <ErrorBox error={sync.error} />
            {sync.data && (
              <p className="text-sm text-emerald-700">
                {sync.data.players} oyuncuyla kadro kuruldu. <Link to="/squad" className="underline">Kadroya git</Link> ·{' '}
                <Link to="/teams" className="underline">Takım profillerine bak</Link>
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
