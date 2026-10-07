import { STYLE_LABELS, stylesOf } from '../lib/formationStyles'
import { Pill } from './ui'

export function FormationStyleChips({ formationId }: { formationId?: string }) {
  const styles = formationId ? stylesOf(formationId) : []
  if (styles.length === 0) {
    return null
  }
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500" title="FC 27 formasyon rehberindeki listelere göre; ölçüm değil, öneridir.">
      {styles.map((s) => (
        <Pill key={s} tone={s === 'attacking' ? 'rose' : s === 'defensive' ? 'sky' : s === 'balanced' ? 'emerald' : 'slate'}>{STYLE_LABELS[s]}</Pill>
      ))}
      <span>rehber önerisi</span>
    </p>
  )
}
