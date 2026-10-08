import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { SetupChips } from '../components/SetupChips'
import { Button, Card, ErrorBox, Pill, Spinner } from '../components/ui'
import { DEFAULT_ANSWERS, profileOf, recommend, type BuildUp, type FormationPref, type Striker, type Width, type WizardAnswers } from '../lib/wizard'
import { tacticStore } from '../state/tacticStore'

interface Option<T> {
  value: T
  label: string
  hint: string
}

const BUILD_UP: Option<BuildUp>[] = [
  { value: 'Short', label: 'Topla oyna', hint: 'Kısa paslarla kur, topu rakibe verme.' },
  { value: 'Balanced', label: 'Dengeli', hint: 'Duruma göre hem kur hem direkt oyna.' },
  { value: 'Counter', label: 'Kontra', hint: 'Topu kazan, hızlı ve dikey çık.' },
]

const DEPTH: Option<number>[] = [
  { value: 30, label: 'Geride bekle', hint: 'Alçak blok, boşluk bırakma.' },
  { value: 50, label: 'Orta blok', hint: 'Orta sahada kompakt dur.' },
  { value: 70, label: 'Yüksek hat', hint: 'Rakibi kendi yarı sahasında sıkıştır.' },
  { value: 90, label: 'Agresif pres', hint: 'Anında pres + ofsayt; hızlı stoper ister.' },
]

const WIDTH: Option<Width>[] = [
  { value: 'wings', label: 'Kanatlardan', hint: 'Bindiren bekler, ortalar, genişlik.' },
  { value: 'center', label: 'Merkezden', hint: 'İçeri kat eden kanatlar, oyun kuran 10.' },
  { value: 'mixed', label: 'Karışık', hint: 'Kararsızım, ikisi de olur.' },
]

const STRIKER: Option<Striker>[] = [
  { value: 'target', label: 'Hedef forvet', hint: 'Güçlü, ortaları ve uzun topları bitirir.' },
  { value: 'run', label: 'Arkaya koşan', hint: 'Hızlı, savunma arkasına sızar.' },
  { value: 'drop', label: 'Düşen / yaratıcı', hint: 'Geri iner, oyunu bağlar (false 9).' },
  { value: 'press', label: 'Pres yapan', hint: 'Savunmanın ilk adamı.' },
  { value: 'any', label: 'Fark etmez', hint: '' },
]

const FORMATION: Option<FormationPref>[] = [
  { value: '4-3-3', label: '4-3-3', hint: '' },
  { value: '4-2-3-1', label: '4-2-3-1', hint: '' },
  { value: '4-4-2', label: '4-4-2', hint: '' },
  { value: 'any', label: 'Fark etmez', hint: '' },
]

function Question<T extends string | number>({ title, options, value, onChange }: { title: string; options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={`cursor-pointer rounded-xl border p-2.5 text-sm transition ${value === o.value ? 'border-emerald-500 bg-emerald-50 dark:bg-slate-700' : 'border-slate-200 hover:border-emerald-300 dark:border-slate-600'}`}
          >
            <input type="radio" className="sr-only" name={title} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function WizardPage() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS)
  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  const results = recommend(presets.data ?? [], answers)

  function apply(preset: Preset) {
    const slots: Record<string, { tags: string[] }> = {}
    Object.entries(preset.slotTags ?? {}).forEach(([slotId, ids]) => (slots[slotId] = { tags: ids }))
    const profile = profileOf(preset)
    tacticStore.set({ formation: preset.formation, presetId: preset.id, slots, setup: { buildUp: profile.buildUp, depth: profile.depth } })
    navigate('/tactics/builder')
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <Card title="Taktik sihirbazı — nasıl oynamak istiyorsun?">
        <div className="space-y-5">
          <Question title="1. Oyun kurulumu" options={BUILD_UP} value={answers.buildUp} onChange={(buildUp) => setAnswers({ ...answers, buildUp })} />
          <Question title="2. Rakip topu kurarken savunman" options={DEPTH} value={answers.depth} onChange={(depth) => setAnswers({ ...answers, depth })} />
          <Question title="3. Hücum yolu" options={WIDTH} value={answers.width} onChange={(width) => setAnswers({ ...answers, width })} />
          <Question title="4. Forvet tipi" options={STRIKER} value={answers.striker} onChange={(striker) => setAnswers({ ...answers, striker })} />
          <Question title="5. Formasyon tercihi" options={FORMATION} value={answers.formation} onChange={(formation) => setAnswers({ ...answers, formation })} />
        </div>
        <p className="mt-4 text-xs text-slate-500">Cevapların hazır taktiklerle (stil, replika, kişisel) karşılaştırılır; sonuçlar anında sağda güncellenir. Taktik, kadronla uyumuna bakılmadan önerilir — kuruduktan sonra Auto-Fit ile kadronu test edebilirsin.</p>
      </Card>

      <div className="space-y-3 lg:sticky lg:top-24">
        <Card title="Sana en yakın taktikler" actions={<Pill tone="emerald">Ücretsiz</Pill>}>
          {presets.isLoading ? (
            <Spinner />
          ) : presets.error ? (
            <ErrorBox error={presets.error} />
          ) : (
            <ol className="space-y-3">
              {results.map((r, index) => (
                <li key={r.preset.id} className={`rounded-xl border p-3 ${index === 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-slate-700' : 'border-slate-200 dark:border-slate-600'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.preset.name}</p>
                      <p className="text-xs text-slate-500">{r.preset.formation}{r.preset.kind === 'REPLICA' ? ' · replika' : r.preset.kind === 'PERSONAL' ? ' · kişisel' : ''}</p>
                    </div>
                    <span className="text-xl font-bold tabular-nums" aria-label={`Uyum %${r.score}`}>%{r.score}</span>
                  </div>
                  {r.reasons.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {r.reasons.map((reason) => (
                        <li key={reason}>
                          <Pill tone="sky">{reason}</Pill>
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.preset.signature && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">{r.preset.signature}</p>}
                  <SetupChips settings={r.preset.settings} />
                  <div className="mt-2">
                    <Button onClick={() => apply(r.preset)}>Bu taktiği kur</Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <p className="text-xs text-slate-500">
          Kadronu da hesaba katan öneri için <Link to="/tactics/builder" className="underline">Kadro kurucu</Link> sayfasındaki Auto-Fit'i kullan.
        </p>
      </div>
    </div>
  )
}
