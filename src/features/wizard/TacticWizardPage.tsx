import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Preset } from '../../api/types'
import { SetupChips } from '../../components/SetupChips'
import { HelpPopover } from '../../components/ui'
import { Button, Chip, ErrorState, Skeleton } from '../../design/components/primitives'
import { DEFAULT_ANSWERS, recommend, type WizardAnswers } from '../../lib/wizard'
import { tacticFromPreset, WIZARD_QUESTIONS, type WizardQuestion } from '../../lib/wizardQuestions'
import { useActiveCareerId } from '../../state/careerStore'
import { labStore } from '../../state/labStore'

const LAB_BUILDER_PATH = '/career/tactics-lab?sekme=kurucu'

const STEPS = [...WIZARD_QUESTIONS.map((q) => q.short), 'Sonuç']
const RESULT_STEP = WIZARD_QUESTIONS.length

/** Adım göstergesi: tamamlanan adım onay simgesiyle, geçerli adım aria-current="step"; dar ekranda yalnız geçerli adımın adı görünür. */
function Stepper({ step }: { step: number }) {
  return (
    <ol aria-label="Adımlar" className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((label, i) => {
        const current = i === step
        const done = i < step
        return (
          <li key={label} aria-current={current ? 'step' : undefined} className="flex shrink-0 items-center gap-1.5 text-sm">
            <span aria-hidden={done ? undefined : 'true'} className={`flex size-7 items-center justify-center rounded-full font-[var(--font-num)] text-xs font-semibold tabular-nums ${current ? 'bg-accent text-on-accent' : done ? 'bg-[var(--good-soft)] text-good' : 'glass-3 text-ink-2'}`}>
              {done ? <><Check size={14} aria-hidden="true" /><span className="sr-only">{i + 1}</span></> : i + 1}
            </span>
            <span className={`${current ? 'font-semibold text-ink' : 'text-ink-2 max-sm:sr-only'}`}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-0.5 h-px w-4 bg-[var(--glass-border)] max-sm:hidden" />}
          </li>
        )
      })}
    </ol>
  )
}

/** Tek karar: soru başlığı + seçenek kartları (radyo grubu, ok tuşlarıyla gezilir). */
function QuestionStep({ question, answers, onAnswer }: { question: WizardQuestion; answers: WizardAnswers; onAnswer: (next: WizardAnswers) => void }) {
  const value = answers[question.key]
  return (
    <div role="radiogroup" aria-labelledby="wizard-question" className="grid gap-2 sm:grid-cols-2">
      {question.options.map((o) => {
        const checked = value === o.value
        return (
          <label
            key={String(o.value)}
            className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-accent ${checked ? 'border-accent bg-[var(--accent-soft)]' : 'glass-3 border-[var(--glass-border)] hover:bg-[var(--glass-hover)]'}`}
          >
            <input type="radio" className="sr-only" name={question.key} checked={checked} onChange={() => onAnswer({ ...answers, [question.key]: o.value })} />
            <span className="font-semibold">{o.label}</span>
            {o.hint && <span className="text-xs text-ink-2">{o.hint}</span>}
          </label>
        )
      })}
    </div>
  )
}

/** Sonuç: cevaplara en yakın hazır taktikler (stil, replika, kişisel); "Bu taktiği kur" kadro kurucuya götürür. */
function Results({ answers, onApply }: { answers: WizardAnswers; onApply: (preset: Preset) => void }) {
  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  if (presets.isLoading) {
    return <Skeleton className="h-48" />
  }
  if (presets.error) {
    return <ErrorState message="Hazır taktikler yüklenemedi." onRetry={() => presets.refetch()} />
  }
  const results = recommend(presets.data ?? [], answers)
  return (
    <ol aria-label="Sana en yakın taktikler" className="flex flex-col gap-2">
      {results.map((r, index) => (
        <li key={r.preset.id} className={`flex flex-col gap-1.5 rounded-[var(--radius-sm)] border p-3 ${index === 0 ? 'border-accent bg-[var(--accent-soft)]' : 'glass-3 border-[var(--glass-border)]'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{r.preset.name}</p>
              <p className="text-xs text-ink-2">{r.preset.formation}{r.preset.kind === 'PERSONAL' ? ' · kişisel' : ''}</p>
            </div>
            <span className="font-[var(--font-num)] text-xl font-semibold tabular-nums" aria-label={`Uyum %${r.score}`}>%{r.score}</span>
          </div>
          {r.reasons.length > 0 && (
            <ul aria-label="Neden" className="flex flex-wrap gap-1">
              {r.reasons.map((reason) => <li key={reason}><Chip tone="info">{reason}</Chip></li>)}
            </ul>
          )}
          {r.preset.signature && <p className="text-xs text-ink-2">{r.preset.signature}</p>}
          <SetupChips settings={r.preset.settings} />
          <Button variant={index === 0 ? 'primary' : 'secondary'} className="self-start" onClick={() => onApply(r.preset)}>Bu taktiği kur</Button>
        </li>
      ))}
    </ol>
  )
}

/**
 * v3 taktik sihirbazı (/tactics/wizard, V3-07b; 11 §9 Akış şablonu): ortada tek cam panel, adım göstergesi, her adımda tek karar, geri/ileri.
 * Sorular ve sonuç v2 ile aynı (lib/wizardQuestions, lib/wizard); seçilen taktik yeni Lab taslağı olarak Lab kurucusunda açılır.
 */
export function TacticWizardPage() {
  const navigate = useNavigate()
  const careerId = useActiveCareerId()
  const [message, setMessage] = useState<string>()
  const [answers, setAnswers] = useState<WizardAnswers>(DEFAULT_ANSWERS)
  const [step, setStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  const question = WIZARD_QUESTIONS[step]

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus()
  }, [step])

  // KARIYER-UX 4a kapanışı: "Uygula" yeni Lab taslağı açar (aktif olur) ve Lab kurucusuna geçer; eski tek kopya depoya yazılmaz.
  // Sınır doluysa mesaj gösterilir ve yönlendirme yapılmaz. Diziliş boş: kurucu ilk açılışta kadrodan dizer.
  function apply(preset: Preset) {
    if (careerId === undefined) {
      setMessage('Taslak açmak için önce bir kariyer seç.')
      return
    }
    const created = labStore.create(careerId, { name: preset.name, origin: { kind: 'wizard', ref: preset.id }, tactic: tacticFromPreset(preset), lineup: {} })
    if (!created.ok) {
      setMessage(created.message)
      return
    }
    navigate(LAB_BUILDER_PATH)
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Taktik sihirbazı</h1>
        <p className="text-sm text-ink-2">Nasıl oynamak istediğini seç; sana en yakın hazır taktikleri bulalım.</p>
      </header>
      <section aria-labelledby="wizard-question" className="glass flex flex-col gap-4 p-4 sm:p-5">
        <Stepper step={step} />
        <div className="flex items-center gap-1.5">
          <h2 id="wizard-question" ref={heading} tabIndex={-1} className="font-display text-xl font-semibold leading-6 outline-none">
            {question ? question.title : 'Sana en yakın taktikler'}
          </h2>
          {!question && (
            <>
              <Chip tone="good">Ücretsiz</Chip>
              <HelpPopover label="Sonuçlar nasıl bulunur">Cevapların hazır taktiklerle (stil, replika, kişisel) karşılaştırılır. Taktik, kadronla uyumuna bakılmadan önerilir; kurduktan sonra kadro kurucuda kadronla dene.</HelpPopover>
            </>
          )}
        </div>
        {question ? <QuestionStep question={question} answers={answers} onAnswer={setAnswers} /> : <Results answers={answers} onApply={apply} />}
        {message && <p role="alert" className="text-sm text-bad">{message}</p>}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--glass-border)] pt-3">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Geri</Button>
          <span className="text-xs text-ink-2">Adım {step + 1} / {STEPS.length}</span>
          {step < RESULT_STEP ? <Button variant="primary" onClick={() => setStep((s) => Math.min(RESULT_STEP, s + 1))}>İleri</Button> : <Button onClick={() => setStep(0)}>Baştan başla</Button>}
        </div>
      </section>
    </div>
  )
}
