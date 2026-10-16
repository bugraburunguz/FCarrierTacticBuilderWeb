import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { SetupChips } from '../components/SetupChips'
import { Button, Card, ErrorBox, Pill, Spinner } from '../components/ui'
import { DEFAULT_ANSWERS, recommend, type WizardAnswers } from '../lib/wizard'
import { tacticFromPreset, WIZARD_QUESTIONS, WIZARD_RESULT_PATH, type WizardOption } from '../lib/wizardQuestions'
import { tacticStore } from '../state/tacticStore'

type Option<T> = WizardOption<T>

function Question<T extends string | number>({ title, options, value, onChange }: { title: string; options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={`cursor-pointer rounded-md border p-2.5 text-sm transition ${value === o.value ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'}`}
          >
            <input type="radio" className="sr-only" name={title} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
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
    tacticStore.set(tacticFromPreset(preset))
    navigate(WIZARD_RESULT_PATH)
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <Card title="Taktik sihirbazı — nasıl oynamak istiyorsun?">
        <div className="space-y-5">
          {WIZARD_QUESTIONS.map((q, i) => (
            <Question<string | number>
              key={q.key}
              title={`${i + 1}. ${q.title}`}
              options={q.options as Option<string | number>[]}
              value={answers[q.key]}
              onChange={(value) => setAnswers({ ...answers, [q.key]: value })}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Cevapların hazır taktiklerle (stil, replika, kişisel) karşılaştırılır; sonuçlar anında sağda güncellenir. Taktik, kadronla uyumuna bakılmadan önerilir — kuruduktan sonra Auto-Fit ile kadronu test edebilirsin.</p>
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
                <li key={r.preset.id} className={`rounded-md border p-3 ${index === 0 ? 'border-accent bg-accent-soft' : 'border-line'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.preset.name}</p>
                      <p className="text-xs text-muted">{r.preset.formation}{r.preset.kind === 'PERSONAL' ? ' · kişisel' : ''}</p>
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
                  {r.preset.signature && <p className="mt-1.5 text-xs text-muted">{r.preset.signature}</p>}
                  <SetupChips settings={r.preset.settings} />
                  <div className="mt-2">
                    <Button onClick={() => apply(r.preset)}>Bu taktiği kur</Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <p className="text-xs text-muted">
          Kadronu da hesaba katan öneri için <Link to="/tactics/builder" className="underline">Kadro kurucu</Link> sayfasındaki Auto-Fit'i kullan.
        </p>
      </div>
    </div>
  )
}
