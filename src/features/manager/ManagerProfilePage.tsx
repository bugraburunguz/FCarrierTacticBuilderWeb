import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { ManagerProfileView } from '../../api/types'
import { ErrorState, Segmented, Skeleton } from '../../design/components/primitives'
import { useMediaQuery } from '../../design/useMediaQuery'
import { ErrorAlert, PRIMARY_BUTTON } from '../account/AccountParts'
import { CLUB_RECS_KEY, MANAGER_PROFILE_KEY, useManagerProfile } from './managerQuery'
import {
  BACKGROUNDS, DIFFICULTIES, LICENCES, MAX_PRIORITIES, PRIORITIES, RETURN_TO, STYLES, band, draftOf, emptyDraft, label, outlook, reputation, styleFromReplica,
  togglePriority, toProfile, validate, type ManagerDraft, type ManagerOption,
} from './managerRules'

const INPUT = 'glass-3 min-h-10 w-full rounded-[var(--radius-sm)] px-3 text-sm text-ink max-sm:min-h-11'
const LABEL = 'text-xs font-medium text-ink-2'
const STEP_BUTTON = 'glass-3 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] px-4 text-sm font-semibold hover:bg-[var(--glass-hover)]'
/** Mobilde adım adım üç bölüm; daha genişte hepsi tek ekranda. */
const NARROW_QUERY = '(max-width: 639px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const STEPS = ['Geçmiş ve diploma', 'Oyun tarzı', 'Öncelik ve zorluk'] as const
const GENDERS = [{ id: 'any', label: 'Fark etmez' }, { id: '0', label: 'Erkek' }, { id: '1', label: 'Kadın' }]

const optionClass = (selected: boolean, disabled = false) =>
  `flex min-h-11 w-full flex-col items-start gap-0.5 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors ${
    selected ? 'bg-[var(--glass-press)] shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass-3 hover:bg-[var(--glass-hover)]'} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`

function OptionText({ option }: { option: ManagerOption<string> }) {
  return (
    <>
      <span className="text-sm font-semibold text-ink">{option.label}</span>
      <span className="text-xs text-ink-2">{option.hint}</span>
    </>
  )
}

/** Tek seçim kartları: radiogroup, ok tuşlarıyla gezinme (Segmented ile aynı davranış), her kartta tek satır açıklama. */
function OptionCards<T extends string>({ label: groupLabel, options, value, onChange, columns = 'sm:grid-cols-2' }: {
  label: string; options: ManagerOption<T>[]; value: T | undefined; onChange: (id: T) => void; columns?: string
}) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.id === value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step !== 0) {
      e.preventDefault()
      const next = options[(Math.max(index, 0) + step + options.length) % options.length]
      onChange(next.id)
      e.currentTarget.querySelector<HTMLButtonElement>(`[data-id="${next.id}"]`)?.focus()
    }
  }
  return (
    <div role="radiogroup" aria-label={groupLabel} onKeyDown={onKey} className={`grid grid-cols-1 gap-2 ${columns}`}>
      {options.map((o, i) => (
        <button key={o.id} type="button" role="radio" data-id={o.id} aria-checked={value === o.id} tabIndex={value === o.id || (value === undefined && i === 0) ? 0 : -1}
          onClick={() => onChange(o.id)} className={optionClass(value === o.id)}>
          <OptionText option={o} />
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="glass flex scroll-mt-[calc(var(--header-h)+12px)] flex-col gap-4 p-4 sm:p-5">
      {/* tabIndex -1: mobilde adım değişince odak bölüm başlığına taşınır. */}
      <h2 tabIndex={-1} className="font-display text-xl font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-accent">{title}</h2>
      {children}
    </section>
  )
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  )
}

/** Canlı özet: itibar çubuğu (0–100) + bant adı + beklenti satırı; kaydetmeden önce yerel önizleme (managerRules). */
function Summary({ draft }: { draft: ManagerDraft }) {
  const value = reputation(draft.background, draft.licence)
  const picks = [label(STYLES, draft.style), draft.formation ?? 'Formasyon fark etmez', ...draft.priorities.map((p) => label(PRIORITIES, p)), `Zorluk: ${label(DIFFICULTIES, draft.difficulty)}`]
  return (
    <aside aria-label="Menajer özeti" className="glass-2 flex flex-col gap-3 p-4 lg:sticky lg:top-[calc(var(--header-h)+12px)]">
      <h2 className="font-display text-lg font-semibold leading-6">{draft.name.trim() || 'Menajer'}</h2>
      {value === undefined ? (
        <p className="text-sm text-ink-2">Geçmiş ve diploma seçince itibar hesaplanır.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{band(value)}</span>
            <span className="font-[var(--font-num)] text-sm tabular-nums text-ink-2">{value}/100</span>
          </div>
          <div role="meter" aria-label="İtibar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${value}, ${band(value)}`}
            className="h-2 overflow-hidden rounded-full bg-[var(--glass-3)]">
            <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${value}%` }} />
          </div>
          <p className="text-sm text-ink-2">{outlook(value)}</p>
        </>
      )}
      <p className="border-t border-[var(--glass-border)] pt-2 text-xs text-ink-2">{picks.filter(Boolean).join(' · ')}</p>
    </aside>
  )
}

function ProfileForm({ initial }: { initial?: ManagerProfileView }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = RETURN_TO[params.get('sonra') ?? '']
  const narrow = useMediaQuery(NARROW_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const stepBox = useRef<HTMLDivElement>(null)
  const stepMoved = useRef(false)
  const ids = { name: useId(), formation: useId(), replica: useId(), league: useId() }
  const [draft, setDraft] = useState<ManagerDraft>(() => (initial ? draftOf(initial.profile) : emptyDraft()))
  const [replicaId, setReplicaId] = useState('')
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string>()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: Infinity })
  const replicas = useQuery({ queryKey: ['replicas'], queryFn: endpoints.replicas, staleTime: Infinity })
  const leagues = useQuery({ queryKey: ['leagues', draft.gender], queryFn: () => endpoints.leagues(draft.gender), staleTime: Infinity })
  const set = (patch: Partial<ManagerDraft>) => {
    setNotice(undefined)
    setDraft((d) => ({ ...d, ...patch }))
  }

  const save = useMutation({
    mutationFn: () => endpoints.saveManagerProfile(toProfile(draft)),
    onSuccess: async (view) => {
      client.setQueryData(MANAGER_PROFILE_KEY, view)
      await client.invalidateQueries({ queryKey: [CLUB_RECS_KEY] })
      if (returnTo) {
        navigate(returnTo)
      } else {
        setNotice('Kaydedildi.')
      }
    },
  })
  const submit = () => {
    const missing = validate(draft)
    setErrors(missing)
    if (missing.length === 0) {
      save.mutate()
    }
  }
  // Mobil adım değişimi: yeni bölümün başına kaydır (azaltılmış harekette animasyonsuz), odağı başlığına taşı. İlk açılışta kaydırma yok.
  const goTo = (next: number) => {
    stepMoved.current = true
    setStep(next)
  }
  useEffect(() => {
    if (!stepMoved.current) {
      return
    }
    stepMoved.current = false
    const section = stepBox.current?.querySelector('section')
    section?.scrollIntoView?.({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
    section?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [step, reducedMotion])
  const pickReplica = (id: string) => {
    setReplicaId(id)
    const replica = replicas.data?.find((r) => r.id === id)
    if (replica) {
      set({ formation: replica.formationId, style: styleFromReplica(replica.buildUp, replica.defensiveApproach) })
    }
  }
  const formationOptions = formations.data ?? []
  const formationMissing = draft.formation && !formationOptions.some((f) => f.id === draft.formation)

  const sections = [
    <Section key="background" title={STEPS[0]}>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.name} className={LABEL}>Menajer adı (isteğe bağlı)</label>
        <input id={ids.name} className={INPUT} maxLength={40} value={draft.name} placeholder="Örn. Buğra" onChange={(e) => set({ name: e.target.value })} />
      </div>
      <Field title="Futbolculuk geçmişi">
        <OptionCards label="Futbolculuk geçmişi" options={BACKGROUNDS} value={draft.background} onChange={(background) => set({ background })} />
      </Field>
      <Field title="Antrenörlük diploması">
        <OptionCards label="Antrenörlük diploması" options={LICENCES} value={draft.licence} onChange={(licence) => set({ licence })} />
      </Field>
    </Section>,
    <Section key="style" title={STEPS[1]}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.formation} className={LABEL}>Formasyon</label>
          <select id={ids.formation} className={INPUT} value={draft.formation ?? ''} onChange={(e) => { setReplicaId(''); set({ formation: e.target.value || undefined }) }}>
            <option value="">Fark etmez</option>
            {formationMissing && <option value={draft.formation}>{draft.formation}</option>}
            {formationOptions.map((f) => <option key={f.id} value={f.id}>{f.displayNameTr ?? f.label ?? f.id}</option>)}
          </select>
          <p className="text-xs text-muted">Fark etmez: her kulüpte kadroya en uygun formasyon kullanılır.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.replica} className={LABEL}>Bir replikayı örnek al</label>
          <select id={ids.replica} className={INPUT} value={replicaId} onChange={(e) => pickReplica(e.target.value)}>
            <option value="">Seç…</option>
            {(replicas.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.club} · {r.coach} ({r.season})</option>)}
          </select>
          <p className="text-xs text-muted">Replikanın formasyonu ve tarzı gelir.</p>
        </div>
      </div>
      <Field title="Tarz">
        <OptionCards label="Tarz" options={STYLES} value={draft.style} onChange={(style) => { setReplicaId(''); set({ style }) }} />
      </Field>
    </Section>,
    <Section key="priority" title={STEPS[2]}>
      <Field title={`Öncelik (en çok ${MAX_PRIORITIES})`}>
        <div role="group" aria-label={`Öncelik (en çok ${MAX_PRIORITIES})`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRIORITIES.map((o) => {
            const checked = draft.priorities.includes(o.id)
            const disabled = !checked && draft.priorities.length >= MAX_PRIORITIES
            return (
              <button key={o.id} type="button" role="checkbox" aria-checked={checked} disabled={disabled}
                onClick={() => set({ priorities: togglePriority(draft.priorities, o.id) })} className={optionClass(checked, disabled)}>
                <OptionText option={o} />
              </button>
            )
          })}
        </div>
        {draft.priorities.length >= MAX_PRIORITIES && <p className="text-xs text-ink-2">En çok {MAX_PRIORITIES} öncelik seçilir; değiştirmek için birini kaldır.</p>}
      </Field>
      <Field title="Zorluk isteği">
        <OptionCards label="Zorluk isteği" options={DIFFICULTIES} value={draft.difficulty} onChange={(difficulty) => set({ difficulty })} columns="sm:grid-cols-3" />
      </Field>
      <Field title="Filtreler (isteğe bağlı)">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Segmented label="Kadın/erkek" value={draft.gender === undefined ? 'any' : String(draft.gender)} options={GENDERS}
            onChange={(id) => set({ gender: id === 'any' ? undefined : Number(id), leagueId: undefined })} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={ids.league} className={LABEL}>Lig</label>
            <select id={ids.league} className={INPUT} value={draft.leagueId ?? ''} onChange={(e) => set({ leagueId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Fark etmez</option>
              {(leagues.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
      </Field>
    </Section>,
  ]
  const last = !narrow || step === STEPS.length - 1

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-3">
        {narrow && <p className="text-xs font-semibold text-ink-2">Adım {step + 1}/{STEPS.length}</p>}
        <div ref={stepBox} className="flex flex-col gap-3">{narrow ? sections[step] : sections}</div>
        {errors.length > 0 && (
          <ul role="alert" className="rounded-[var(--radius-sm)] border border-[var(--bad)] px-3 py-2 text-sm text-bad">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
        <ErrorAlert error={save.error} />
        {notice && <p role="status" className="text-sm text-good">{notice}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {narrow && step > 0 && <button type="button" className={STEP_BUTTON} onClick={() => goTo(step - 1)}>Geri</button>}
          {!last && <button type="button" className={`${PRIMARY_BUTTON} flex-1`} onClick={() => goTo(step + 1)}>İleri</button>}
          {last && (
            <button type="button" disabled={save.isPending} onClick={submit} className={`${PRIMARY_BUTTON} sm:w-auto`}>
              {save.isPending ? 'Kaydediliyor…' : 'Profili kaydet'}
            </button>
          )}
        </div>
      </div>
      <Summary draft={draft} />
    </div>
  )
}

/**
 * Menajer profili (MGR-b): itibar (geçmiş + diploma) ve tercihler; hesaba bağlı, her yeni kariyerde kulüp önerisini yönlendirir.
 * FC'de menajerin oyun içi özelliği yok; itibar engellemez. `?sonra=yeni|masa` kayıttan sonra oraya döner.
 */
export function ManagerProfilePage() {
  const profile = useManagerProfile()
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Menajer profili</h1>
        <p className="text-sm text-ink-2">Hesabına bağlı; her yeni kariyerde kulüp önerilerini yönlendirir. İtibar gösterir, hiçbir kulübü kapatmaz.</p>
      </header>
      {profile.isLoading ? <Skeleton className="h-96" /> : profile.failed ? (
        <ErrorState message="Menajer profili yüklenemedi." onRetry={() => profile.refetch()} />
      ) : (
        <ProfileForm initial={profile.data ?? undefined} />
      )}
    </div>
  )
}
