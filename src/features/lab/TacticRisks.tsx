import { AlertTriangle } from 'lucide-react'
import { SourceTag } from '../../design/components/primitives'
import { useTacticRisks, type TacticRiskInput } from './useTacticRisks'

/** Lab › "Taktik riskleri": useTacticRisks listesi (Masa sayısıyla aynı); her risk başlık, kanıt ve öneriyle. */
export function TacticRisks(props: TacticRiskInput) {
  const { careerId, setup } = props
  const { risks, loading, error, partial, stale } = useTacticRisks(props)
  if (careerId === undefined || !setup) {
    return null
  }
  return (
    <section aria-label="Taktik riskleri" className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Taktik riskleri</h4>
        <SourceTag source={{ kind: 'draft' }} />
      </header>
      {partial && <p role="status" className="text-xs text-warn">Diziliş kuralları alınamadı; yalnız kurulum kontrolleri gösteriliyor.</p>}
      {stale && <p role="status" className="text-xs text-warn">Diziliş kuralları güncellenemedi; son başarılı sonuç gösteriliyor.</p>}
      {loading ? <p className="text-xs text-ink-2">Kontrol ediliyor…</p> : error ? <p className="text-xs text-ink-2">Riskler alınamadı.</p> : risks.length === 0 ? (partial ? null :
        <p className="text-xs text-ink-2">Belirgin risk yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {risks.map((r) => (
            <li key={r.key} className="glass-3 flex flex-col gap-1 rounded-[var(--radius-sm)] p-2 text-xs">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <AlertTriangle size={14} aria-hidden="true" className={r.high ? 'text-bad' : 'text-warn'} />
                {r.title}
                <span className="sr-only">{r.high ? '(yüksek risk)' : '(orta risk)'}</span>
              </span>
              <span className="text-ink-2">{r.detail}</span>
              {r.evidence && <span className="text-ink-2">{r.evidence}</span>}
              {r.advice && <span className="font-medium text-ink">Öneri: {r.advice}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
