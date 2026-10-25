import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'
import { endpoints } from '../../api/endpoints'
import type { TacticAnalysisRequest, TacticRequest } from '../../api/types'
import { SourceTag } from '../../design/components/primitives'
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const RISK_DEBOUNCE_MS = 400
/** Kanıtta gösterilen en zayıf oyuncu sayısı. */
const EVIDENCE_PLAYERS = 3

interface Risk {
  key: string
  title: string
  high: boolean
  detail: string
  evidence?: string
  advice?: string
}

/** Taslaktan analiz isteği: yalnız rol seçilen slotlar (gerisi formasyon varsayılanı), dizili oyuncular. */
function analysisBody(careerId: number, setup: { buildUp: string; depth: number }, tactic: TacticRequest, assigned: Record<string, number>): TacticAnalysisRequest {
  return {
    formation: tactic.formation!,
    buildUp: setup.buildUp,
    depth: setup.depth,
    slots: tactic.slots.flatMap((s) => (s.roleId ? [{ slotId: s.slotId, roleId: s.roleId }] : [])),
    careerId,
    assigned,
  }
}

interface RiskInput {
  careerId?: number
  setup?: { buildUp: string; depth: number }
  tactic?: TacticRequest
  assigned?: Record<string, number>
}

/**
 * Taktik riskleri (Lab paneli ve Masa sayısı aynı liste): kurulum kontrolleri (/fit/setup-check, FIT-1 madde 5; çıkış + hat) ve taslağın diziliş
 * kuralları (/tactics/analysis, FIT-2 madde 7: kontra riski, yaratıcılık, santrfor yalnızlığı vb.; roller + oyuncular). İkisi de bekletilmiş.
 * Uygun kontroller ve bilgi düzeyindeki bulgular dahil değil.
 */
export function useTacticRisks({ careerId, setup, tactic, assigned }: RiskInput) {
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
  const request = careerId !== undefined && setup && tactic?.formation ? JSON.stringify(analysisBody(careerId, setup, tactic, assigned ?? {})) : ''
  const settledRequest = useDebouncedValue(request, RISK_DEBOUNCE_MS)
  const analysis = useQuery({
    queryKey: ['tactic-analysis', settledRequest],
    queryFn: () => endpoints.tacticAnalysis(JSON.parse(settledRequest) as TacticAnalysisRequest),
    enabled: settledRequest !== '',
    staleTime: 300_000,
    retry: false,
  })
  const risks = useMemo<Risk[]>(() => [
    ...(check.data ?? []).filter((c) => c.status !== 'GREEN').map((c) => {
      const weak = c.players.filter((p) => !p.ok).slice(0, EVIDENCE_PLAYERS)
      return { key: c.id ?? c.title, title: c.title, high: c.status === 'RED', detail: c.detail, advice: c.advice,
        evidence: weak.length > 0 ? `Eşiğin altında: ${weak.map((p) => `${p.name} ${p.value}`).join(', ')}` : undefined }
    }),
    ...(analysis.data?.findings ?? []).filter((f) => f.severity !== 'INFO').map((f) => ({
      key: `${f.code}-${f.instance.side ?? ''}`, title: f.title, high: f.severity === 'RISK', detail: f.text, advice: f.recommendation?.text,
    })),
  ], [check.data, analysis.data])
  return { risks, loading: check.isLoading, error: check.isError, ready: check.isSuccess }
}

/** Lab › "Taktik riskleri": useTacticRisks listesi; her risk başlık, kanıt ve öneriyle. */
export function TacticRisks(props: RiskInput) {
  const { careerId, setup } = props
  const { risks, loading, error } = useTacticRisks(props)
  if (careerId === undefined || !setup) {
    return null
  }
  return (
    <section aria-label="Taktik riskleri" className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">Taktik riskleri</h4>
        <SourceTag source={{ kind: 'draft' }} />
      </header>
      {loading ? <p className="text-xs text-ink-2">Kontrol ediliyor…</p> : error ? <p className="text-xs text-ink-2">Riskler alınamadı.</p> : risks.length === 0 ? (
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
