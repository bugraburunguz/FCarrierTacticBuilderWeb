import { Info } from 'lucide-react'
import type { TacticAnalysis, TacticFinding } from '../../api/types'
import { HelpPopover } from '../../components/ui'
import { EmptyState } from '../../design/components/primitives'
import { evidenceText, FINDINGS_TITLE } from './labels'

function FindingItem({ finding }: { finding: TacticFinding }) {
  return (
    <li className="glass-3 flex flex-col gap-1.5 p-3">
      <h4 className="flex items-center gap-1.5 font-display text-base font-semibold leading-5">
        <Info size={14} aria-hidden="true" className="shrink-0 text-ink-2" />
        {finding.title}
        {finding.instance.sideTr && <span className="text-sm font-normal text-ink-2">· {finding.instance.sideTr}</span>}
      </h4>
      <p className="text-sm text-ink-2">{finding.text}</p>
      <details className="text-sm">
        <summary className="min-h-8 cursor-pointer text-xs font-semibold text-accent max-sm:min-h-11">Neden?</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-2">
          {finding.evidence.map((e, i) => (
            <li key={i}>{evidenceText(e)}</li>
          ))}
        </ul>
        {finding.recommendation && <p className="mt-1.5 text-xs text-ink-2">Denenebilir: {finding.recommendation.text}</p>}
      </details>
    </li>
  )
}

/**
 * Replika ekranının "Bu taktiğin dikkat noktaları" bölümü. Replikalar bilinçli tercihtir: bulgular nötr tonda gösterilir (renkli şiddet yok);
 * kanıt sayıları "Neden?" altında. `withPlayers`: oyuncu atandıysa oyunculu bulgular da hesaplanmıştır.
 */
export function AttentionPoints({ analysis, withPlayers = false }: { analysis: TacticAnalysis; withPlayers?: boolean }) {
  const attention = analysis.findings.filter((f) => f.severity !== 'INFO')
  const notes = analysis.findings.filter((f) => f.severity === 'INFO')
  return (
    <section aria-label={FINDINGS_TITLE} className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold leading-6">
        {FINDINGS_TITLE}
        <HelpPopover label="Dikkat noktaları nedir">Replikalar bilinçli tercihlerdir. Bunlar, bu taktikte oyuncu ve ayar seçerken gözünün önünde tutman gereken yerlerdir.</HelpPopover>
      </h3>
      {attention.length === 0 && notes.length === 0 && <EmptyState>Dikkat çeken bir nokta yok.</EmptyState>}
      {attention.length > 0 && (
        <ul className="flex flex-col gap-2">
          {attention.map((f, i) => (
            <FindingItem key={`${f.code}-${f.instance.side ?? i}`} finding={f} />
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <>
          <h4 className="text-xs font-medium text-muted">Notlar</h4>
          <ul className="flex flex-col gap-2">
            {notes.map((f, i) => (
              <FindingItem key={`${f.code}-${f.instance.side ?? i}`} finding={f} />
            ))}
          </ul>
        </>
      )}
      {!withPlayers && analysis.notEvaluated.length > 0 && <p className="text-xs text-muted">Oyuncu atayınca {analysis.notEvaluated.length} kontrol daha yapılır.</p>}
    </section>
  )
}
