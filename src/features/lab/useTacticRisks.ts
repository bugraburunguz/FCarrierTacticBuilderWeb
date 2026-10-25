import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ApiError } from '../../api/client'
import { endpoints } from '../../api/endpoints'
import type { TacticAnalysis, TacticAnalysisRequest, TacticRequest } from '../../api/types'

const TOO_MANY_REQUESTS = 429
import { useDebouncedValue } from '../../lib/useDebouncedValue'

const RISK_DEBOUNCE_MS = 400
/** Kanıtta gösterilen en zayıf oyuncu sayısı. */
const EVIDENCE_PLAYERS = 3

export interface TacticRisk {
  key: string
  title: string
  high: boolean
  detail: string
  evidence?: string
  advice?: string
}

export interface TacticRiskInput {
  careerId?: number
  setup?: { buildUp: string; depth: number }
  tactic?: TacticRequest
  assigned?: Record<string, number>
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

/**
 * Taktik riskleri (Lab paneli ve Masa sayısı aynı liste): kurulum kontrolleri (/fit/setup-check, FIT-1 madde 5; çıkış + hat) ve taslağın diziliş
 * kuralları (/tactics/analysis, FIT-2 madde 7: kontra riski, yaratıcılık, santrfor yalnızlığı vb.; roller + oyuncular). İkisi de bekletilmiş.
 * Uygun kontroller ve bilgi düzeyindeki bulgular dahil değil.
 */
export function useTacticRisks({ careerId, setup, tactic, assigned }: TacticRiskInput) {
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
    queryKey: ['tactic-analysis', careerId, settledRequest],
    queryFn: () => endpoints.tacticAnalysis(JSON.parse(settledRequest) as TacticAnalysisRequest),
    enabled: settledRequest !== '',
    staleTime: 300_000,
    retry: false,
  })
  // Karar (FIT-2): analiz sınırı (429) aşılırsa bu kariyerin son başarılı analizi "güncellenemedi" notuyla gösterilir.
  const client = useQueryClient()
  const rateLimited = analysis.error instanceof ApiError && analysis.error.status === TOO_MANY_REQUESTS
  const lastGood = rateLimited
    ? client.getQueryCache().findAll({ queryKey: ['tactic-analysis', careerId], predicate: (q) => q.state.status === 'success' })
      .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]?.state.data as TacticAnalysis | undefined
    : undefined
  const findings = analysis.data?.findings ?? lastGood?.findings
  const risks = useMemo<TacticRisk[]>(() => [
    ...(check.data ?? []).filter((c) => c.status !== 'GREEN').map((c) => {
      const weak = c.players.filter((p) => !p.ok).slice(0, EVIDENCE_PLAYERS)
      return { key: c.id ?? c.title, title: c.title, high: c.status === 'RED', detail: c.detail, advice: c.advice,
        evidence: weak.length > 0 ? `Eşiğin altında: ${weak.map((p) => `${p.name} ${p.value}`).join(', ')}` : undefined }
    }),
    ...(findings ?? []).filter((f) => f.severity !== 'INFO').map((f) => ({
      key: `${f.code}-${f.instance.side ?? ''}`, title: f.title, high: f.severity === 'RISK', detail: f.text, advice: f.recommendation?.text,
    })),
  ], [check.data, findings])
  // İnceleme: iki kaynak birlikte — analiz yüklenirken ya da alınamadıyken "risk yok" denmez (analiz kovası 60/dk, /fit/lineup ile ortak).
  const analysisAsked = settledRequest !== ''
  return {
    risks,
    loading: check.isLoading || (analysisAsked && analysis.isLoading),
    error: check.isError,
    /** Diziliş kuralları alınamadı ve elde önceki sonuç yok: liste yalnız kurulum kontrollerinden. */
    partial: analysisAsked && analysis.isError && !lastGood,
    /** 429: diziliş kuralları son başarılı sonuçtan (güncellenemedi). */
    stale: analysisAsked && analysis.isError && lastGood !== undefined,
    ready: check.isSuccess && (!analysisAsked || analysis.isSuccess || lastGood !== undefined),
  }
}
