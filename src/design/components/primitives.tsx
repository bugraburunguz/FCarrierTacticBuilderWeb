import { BadgeCheck, Database, PencilLine, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'

/*
 * v3 bileşenleri (docs/review/v2/11 §6). Radix henüz kurulu değil (paket onayı bekliyor): odak tuzağı/Esc gerektirmeyen
 * bileşenler düz React; SidePanel yalnız Esc + odak yönetimi yapar. Renk/yüzey yalnız token'larla (köprü sınıfları + .glass*).
 */
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')

/**
 * Veri katmanı (KARIYER-UX D-28): kayıt verisi (salt okunur içe aktarım), kariyer kararı (sunucu), Lab taslağı (yerel), otomatik öneri (ana taktik değil).
 */
export type DataSource =
  | { kind: 'record'; at: string }
  | { kind: 'decision'; label?: string }
  | { kind: 'draft'; savedSlot?: number }
  | { kind: 'auto' }

const SHORT_DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })

function sourceText(source: DataSource): string {
  switch (source.kind) {
    case 'record':
      return `Kayıt verisi · ${SHORT_DATE.format(new Date(source.at))}`
    case 'decision':
      return source.label ?? 'Kararın'
    case 'draft':
      return source.savedSlot ? `Taslak · Slot ${source.savedSlot}` : 'Taslak · kaydedilmedi'
    case 'auto':
      return 'Otomatik öneri · ana taktik değil'
  }
}

const SOURCE_ICON = { record: Database, decision: BadgeCheck, draft: PencilLine, auto: Sparkles } as const

/** SourceTag: verinin hangi katmandan geldiği (ikon + metin; renk tek başına anlam taşımaz, ≥12px). */
export function SourceTag({ source, className }: { source: DataSource; className?: string }) {
  const Icon = SOURCE_ICON[source.kind]
  return (
    <span data-source={source.kind} className={cx('inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium',
      source.kind === 'draft' ? 'border-dashed border-[var(--edge-draft)] text-ink' : 'border-[var(--glass-border)] text-ink-2', 'glass-3', className)}>
      <Icon aria-hidden="true" size={13} strokeWidth={2} />
      {sourceText(source)}
    </span>
  )
}

export type PanelEdge = 'default' | 'glow' | 'draft'

/**
 * Panel: tek `.glass` yüzey, başlık satırı (Barlow 20) + kaynak etiketi + sağ eylem. İç içe `.glass` yok.
 * edge: glow = 1px --edge-glow halka (kariyer kararı / vurgu), draft = 1px kesik --edge-draft (Lab taslağı). Animasyon yok.
 */
export function Panel({ title, actions, source, edge = 'default', children, className, as: Tag = 'section', label }: {
  title?: ReactNode; actions?: ReactNode; source?: DataSource; edge?: PanelEdge; children: ReactNode; className?: string; as?: 'section' | 'div'
  /** Bölge adı (aria-label): verilirse panel ekran okuyucuda adlı bölge olur. */
  label?: string
}) {
  return (
    <Tag data-edge={edge} aria-label={label} className={cx('glass p-4 text-ink sm:px-5', edge !== 'default' && `panel-edge-${edge}`, className)}>
      {(title || actions || source) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {title && <h2 className="font-display text-xl font-semibold leading-6">{title}</h2>}
            {source && <SourceTag source={source} />}
          </span>
          {actions}
        </header>
      )}
      {children}
    </Tag>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border border-transparent hover:opacity-90',
  secondary: 'glass-3 text-ink hover:bg-[var(--glass-hover)] active:bg-[var(--glass-press)]',
  ghost: 'border border-transparent text-ink-2 hover:bg-[var(--glass-hover)]',
  danger: 'bg-bad text-on-accent border border-transparent hover:opacity-90',
}

/**
 * Button: 40px (mobil 44px). Devre dışıyken de metin ve kenar arka planla ≥3:1 (opaklık değil `--muted` + çizgi, Q12);
 * `disabledReason` verilirse nedeni yanında kısa metinle görünür.
 */
export function Button({ variant = 'secondary', className, disabled, disabledReason, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; disabledReason?: string }) {
  const reasonId = useId()
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        {...props}
        disabled={disabled}
        aria-describedby={disabled && disabledReason ? reasonId : props['aria-describedby']}
        className={cx(
          'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 text-sm font-semibold transition-transform active:scale-[0.97] max-sm:min-h-11',
          disabled ? 'cursor-not-allowed border border-[var(--faint)] bg-surface-2 text-muted' : VARIANT[variant],
          className,
        )}
      >
        {children}
      </button>
      {disabled && disabledReason && (
        <span id={reasonId} className="text-xs text-muted">
          {disabledReason}
        </span>
      )}
    </span>
  )
}

/** Chip: yazı ≥12px; etkileşimliyse dokunma hedefi ≥32px (mobilde 44px, Q13). */
export function Chip({ children, tone, onClick, pressed, className, title }: { children: ReactNode; tone?: 'good' | 'warn' | 'bad' | 'info'; onClick?: () => void; pressed?: boolean; className?: string; title?: string }) {
  const toneClass = tone === 'good' ? 'bg-[var(--good-soft)] text-good' : tone === 'warn' ? 'bg-[var(--warn-soft)] text-warn' : tone === 'bad' ? 'bg-[var(--bad-soft)] text-bad' : tone === 'info' ? 'bg-[var(--info-soft)] text-info' : 'glass-3 text-ink-2'
  const base = cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--glass-border)] px-3 text-xs font-medium', toneClass, className)
  if (!onClick) {
    return <span className={cx(base, 'min-h-6')} title={title}>{children}</span>
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} title={title} className={cx(base, 'min-h-8 max-sm:min-h-11', pressed && 'ring-2 ring-accent')}>
      {children}
    </button>
  )
}

/** StatTile: büyük mono sayı + etiket; boş değer "–" (08 §16). */
/** Δ çipi (11 §6): yön oku + işaretli metin; iyi/kötü yorumu yapılmaz (bütçe artışı iyi, maaş artışı kötü olabilir), kıyas `label`'da. */
export interface StatDelta {
  value: number
  text: string
  label: string
}

export function StatTile({ label, value, suffix, delta, children }: { label: string; value?: ReactNode; suffix?: string; delta?: StatDelta; children?: ReactNode }) {
  const direction = delta === undefined ? undefined : delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat'
  return (
    <div className="glass-3 flex min-w-[96px] flex-1 flex-col px-3 py-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-[var(--font-num)] text-2xl font-medium tabular-nums leading-tight text-ink">{value ?? '–'}</span>
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
        {delta && (
          <span data-delta={direction} title={delta.label} className="inline-flex min-h-6 items-center gap-1 rounded-full border border-[var(--glass-border)] px-2 font-[var(--font-num)] text-xs tabular-nums text-ink-2">
            <span aria-hidden="true">{direction === 'up' ? '▲' : direction === 'down' ? '▼' : '='}</span>
            <span>{delta.text}</span>
            <span className="sr-only">{delta.label}</span>
          </span>
        )}
      </span>
      {children}
    </div>
  )
}

/** Skeleton: yatay parıltı yalnız transform ile; azaltılmış harekette sabit (glass.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('glass-3 h-6 animate-pulse', className)} />
}

/** Yükleme / boş / hata üçlüsünün boş ve hata hâlleri (Q1). */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 py-6 text-center text-sm text-ink-2">
      <p>{children}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center text-sm text-bad">
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Tekrar dene</Button>}
    </div>
  )
}

/** 33 bölmeli kimya çubuğu (--chem-* rampası); değer yanında "X/33" yazılır. */
export function ChemBar({ value, max = 33 }: { value: number; max?: number }) {
  const tone = value >= 28 ? 'var(--chem-3)' : value >= 20 ? 'var(--chem-2)' : value > 0 ? 'var(--chem-1)' : 'var(--chem-0)'
  return (
    <div className="flex items-center gap-2">
      <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label="Toplam kimya" className="flex flex-1 gap-px">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="h-2 flex-1 rounded-[2px]" style={{ background: i < value ? tone : 'var(--glass-3)' }} />
        ))}
      </div>
      <span className="font-[var(--font-num)] text-xs tabular-nums text-ink-2">{value}/{max}</span>
    </div>
  )
}

/** Segmented: radiogroup, ok tuşlarıyla gezinme; seçili öğe dolu cam. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.id === value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (step !== 0) {
      e.preventDefault()
      onChange(options[(index + step + options.length) % options.length].id)
    }
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="glass-3 inline-flex gap-0.5 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          tabIndex={value === o.id ? 0 : -1}
          onClick={() => onChange(o.id)}
          className={cx('min-h-8 rounded-[var(--radius-sm)] px-3 text-xs font-semibold max-sm:min-h-11', value === o.id ? 'bg-[var(--glass-press)] text-ink shadow-[inset_0_-2px_0_var(--accent)]' : 'text-ink-2 hover:bg-[var(--glass-hover)]')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * SidePanel (08 §15-16): sağda 380px `.glass-2`; mobilde alttan sheet (%85). Esc kapatır; açılınca odak panele gelir, kapanınca tetikleyiciye döner.
 * `sheet`: dar ekranda alttan sheet (kart seçimi); aksi halde (varsayılan bilgi hâli) sayfa akışında durur. Modal değildir; odak tuzağı yok.
 */
export function SidePanel({ title, onClose, children, open = true, sheet = false }: { title: string; onClose?: () => void; children: ReactNode; open?: boolean; sheet?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) {
      return
    }
    if (!sheet) {
      return undefined
    }
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    return () => previous?.focus?.({ preventScroll: true })
  }, [open, sheet])
  if (!open) {
    return null
  }
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      aria-label={title}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      className={cx('glass-2 flex flex-col overflow-hidden p-4 text-ink outline-none min-[820px]:sticky min-[820px]:top-[var(--header-h)] min-[820px]:max-h-[calc(100dvh-var(--header-h))] min-[820px]:w-[380px] min-[820px]:shrink-0 min-[820px]:self-start', sheet && 'fixed inset-x-0 bottom-0 z-30 max-h-[85vh]')}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold leading-6">{title}</h2>
        {onClose && (
          <Button variant="ghost" aria-label="Paneli kapat" onClick={onClose}>
            Kapat
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}

/**
 * Tabs: `role=tablist` + `tabpanel` (WEB-DS-10). Ok tuşlarıyla gezinme, seçili sekme dolu cam + vurgu alt çizgisi.
 * `idPrefix` sekme ve panel kimliklerini bağlar: panel `${idPrefix}-panel-${id}`, sekme `${idPrefix}-tab-${id}`.
 */
export function Tabs<T extends string>({ label, idPrefix, value, tabs, onChange }: { label: string; idPrefix: string; value: T; tabs: { id: T; label: ReactNode }[]; onChange: (id: T) => void }) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === value)
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      onChange(tabs[e.key === 'Home' ? 0 : tabs.length - 1].id)
    } else if (step !== 0) {
      e.preventDefault()
      onChange(tabs[(index + step + tabs.length) % tabs.length].id)
    }
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="glass-3 flex gap-0.5 p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`${idPrefix}-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={`${idPrefix}-panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          ref={(el) => {
            if (el && value === t.id && document.activeElement?.getAttribute('role') === 'tab' && document.activeElement !== el && document.activeElement.id.startsWith(`${idPrefix}-tab-`)) {
              el.focus()
            }
          }}
          className={cx('min-h-9 flex-1 rounded-[var(--radius-sm)] px-2 text-center text-sm font-semibold leading-tight max-sm:min-h-11', value === t.id ? 'bg-[var(--glass-press)] text-ink shadow-[inset_0_-2px_0_var(--accent)]' : 'text-ink-2 hover:bg-[var(--glass-hover)]')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/**
 * keepMounted (REVIEW Y6): pasif sekmede içerik gizlenir ama bağlı kalır; ücretli sonuç, yarım form gibi yerel durum sekme değişince
 * kaybolmaz. Varsayılan: pasif sekme çizilmez.
 */
export function TabPanel({ idPrefix, id, active, keepMounted = false, children }: { idPrefix: string; id: string; active: boolean; keepMounted?: boolean; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={!active} tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-accent">
      {active || keepMounted ? children : null}
    </div>
  )
}
