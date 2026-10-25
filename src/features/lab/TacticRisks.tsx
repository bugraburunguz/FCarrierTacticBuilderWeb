import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { endpoints } from '../../api/endpoints'
import { SourceTag } from '../../design/components/primitives'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const RISK_DEBOUNCE_MS = 400
/** Kanıtta gösterilen en zayıf oyuncu sayısı. */
const EVIDENCE_PLAYERS = 3

/**
 * Lab › "Taktik riskleri" (FIT-1 madde 5): v2 TeamSetup'la birlikte kaybolan /fit/setup-check, aktif taslağın çıkış ve hat değeriyle (bekletilmiş).
 * Her risk: başlık, kanıt (eşiği karşılamayan oyuncular sayısıyla) ve öneri. Uygun (yeşil) kontroller listelenmez.
 */
export function TacticRisks({ careerId, setup }: { careerId?: number; setup?: { buildUp: string; depth: number } }) {
  const settled = useDebouncedValue(setup ? `${setup.buildUp}|${setup.depth}` : '', RISK_DEBOUNCE_MS)
  const [buildUp, depthText] = settled.split('|')
  const depth = Number(depthText)
  const check = useQuery({
    queryKey: ['setup-check', careerId, buildUp, depth],
    queryFn: () => endpoints.setupCheck({ careerId: careerId!, buildUp, depth }),
    enabled: careerId !== undefined && settled !== '',
    staleTime: 300_000,
    retry: false,
  })
  if (careerId === undefined || !setup) {
    return null
  }
  const risks = (check.data ?? []).filter((c) => c.status !== 'GREEN')
  return (
    <section aria-label="Taktik riskleri" className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Taktik riskleri</h4>
        <SourceTag source={{ kind: 'draft' }} />
      </header>
      {check.isLoading ? <p className="text-xs text-ink-2">Kontrol ediliyor…</p> : check.isError ? <p className="text-xs text-ink-2">Riskler alınamadı.</p> : risks.length === 0 ? (
        <p className="text-xs text-ink-2">Belirgin risk yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {risks.map((r) => {
            const weak = r.players.filter((p) => !p.ok).slice(0, EVIDENCE_PLAYERS)
            return (
              <li key={r.title} className="glass-3 flex flex-col gap-1 rounded-[var(--radius-sm)] p-2 text-xs">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <AlertTriangle size={14} aria-hidden="true" className={r.status === 'RED' ? 'text-bad' : 'text-warn'} />
                  {r.title}
                  <span className="sr-only">{r.status === 'RED' ? '(yüksek risk)' : '(orta risk)'}</span>
                </span>
                <span className="text-ink-2">{r.detail}</span>
                {weak.length > 0 && <span className="text-ink-2">Eşiğin altında: {weak.map((p) => `${p.name} ${p.value}`).join(', ')}</span>}
                {r.advice && <span className="font-medium text-ink">Öneri: {r.advice}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
