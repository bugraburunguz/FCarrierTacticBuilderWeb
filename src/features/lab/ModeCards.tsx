import { LayoutGrid, Medal, Sparkles, type LucideIcon } from 'lucide-react'

export type LabMode = 'blank' | 'replica' | 'squad'

const MODES: { id: LabMode; index: string; title: string; text: string; Icon: LucideIcon }[] = [
  { id: 'blank', index: 'Mod 01', title: 'Sıfırdan kur', text: 'Boş formasyonla başla; her mevkiye oyuncuyu sen seç.', Icon: LayoutGrid },
  { id: 'replica', index: 'Mod 02', title: 'Replika kullan', text: 'Gerçek takımların taktiğini kadrona uygula.', Icon: Medal },
  { id: 'squad', index: 'Mod 03', title: 'Kadroma göre bul', text: 'Oynamak istediğin futbolu seç; taktik kadrona göre kurulsun.', Icon: Sparkles },
]

/**
 * Taktik modu kartları (FCA-3, Stitch): Sıfırdan kur (boş taslak → Kurucu), Replika kullan (Replikalar), Kadroma göre bul (Sihirbaz).
 * Etkin mod açık sekmeden gelir; buton `aria-pressed` taşır. Yeni işlev yok: üçü de mevcut Lab akışları.
 */
export function ModeCards({ active, disabled, onPick }: { active?: LabMode; disabled?: boolean; onPick: (mode: LabMode) => void }) {
  return (
    <div role="group" aria-label="Taktik modu" className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
      {MODES.map(({ id, index, title, text, Icon }) => {
        const on = active === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            disabled={disabled && id === 'blank'}
            onClick={() => onPick(id)}
            className={`glass flex min-h-11 items-center gap-3 p-3 text-left sm:items-start sm:p-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${on ? 'border-[var(--accent)] bg-[var(--glass-2)]' : 'hover:bg-[var(--glass-hover)]'}`}
          >
            <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-[var(--glass-3)] ${on ? 'text-accent' : 'text-ink-2'}`}>
              <Icon size={20} />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{index}{on ? ' · etkin' : ''}</span>
              <span data-mode-title className="panel-title font-display text-xl font-bold leading-6 text-ink">{title}</span>
              {/* Dar ekranda açıklama gizli: üç kart ekranın yarısını kaplıyordu; ad ve sıra yeterli. */}
              <span className="text-sm text-ink-2 max-sm:hidden">{text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
