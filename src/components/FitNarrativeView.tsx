import type { FitNarrative } from '../api/types'
import { TAILORED_TEXT } from '../lib/fitLabels'
import { Chip } from '../design/components/primitives'

/**
 * Rol uyumu anlatımı (E3-8): öneri satırı, oyuncu sayfası ve analiz aynı bileşeni kullanır. Cümleler sunucuda yalnız katkı ve kanıt sayılarından üretilir;
 * "Biçilmiş kaftan" rozetini sunucu belirler (web eşik bilmez).
 */
export function FitNarrativeView({ narrative }: { narrative: FitNarrative }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        {narrative.tailored && <Chip tone="good">{TAILORED_TEXT}</Chip>}
        <span>{narrative.headline}</span>
      </p>
      {narrative.strengths.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-ink-2">Güçlü yönler</h4>
          <ul className="list-disc space-y-0.5 pl-5">
            {narrative.strengths.map((s) => (
              <li key={s.term + s.key}>{s.text}</li>
            ))}
          </ul>
        </section>
      )}
      {narrative.weaknesses.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-ink-2">Zayıf yönler</h4>
          <ul className="list-disc space-y-0.5 pl-5">
            {narrative.weaknesses.map((s) => (
              <li key={s.term + s.key}>{s.text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
