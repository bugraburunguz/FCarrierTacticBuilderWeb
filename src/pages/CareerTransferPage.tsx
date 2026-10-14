import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { CareerRecommendationItem } from '../api/types'
import { MoneyInput } from '../components/MoneyInput'
import { ShortlistLabel } from '../components/ShortlistLabel'
import { Button, Card, EmptyState, Field, HelpPopover, Skeleton, Stat } from '../components/ui'
import { RecommendationPanel } from '../features/recommend/RecommendationPanel'
import { FitBadge } from '../components/card/FitBadge'
import { Chip } from '../design/components/primitives'
import { useCareerBinding } from '../features/squad/useCareerBinding'
import { needsFromFits, useSlotFits } from '../features/squad/useSlotFits'
import { useSquadWorkspace } from '../features/squad/useSquadWorkspace'
import { depthRows, GROUP_LABEL, TRANSFER_ROLE_BY_GROUP } from '../lib/deskRules'
import { levelText } from '../lib/fitLabels'
import { formatEur } from '../lib/format'
import { useActiveCareerId } from '../state/careerStore'

interface Need {
  key: string
  position: string
  roleId: string
  label: string
  detail: string
  state?: import('../components/card/FitBadge').FitState
}

/** Transfer Merkezi (CAR-23): ihtiyaçlar → adaylar → kısa liste ve bütçe simülatörü; satış planı etiketlenen/yaşlı yedeklerden gelir. */
export function CareerTransferPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const [params] = useSearchParams()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  // İhtiyaçlar sahadaki rozetle AYNI kaynaktan (v3 levelFit + rozet bandı) okur: aynı oyuncu, aynı sayı.
  const { binding, playerById } = useCareerBinding(id, squad.data)
  const ws = useSquadWorkspace('career', binding)
  const { rows: fitRows, pending: fitsPending } = useSlotFits(ws, playerById)
  const [allSquad, setAllSquad] = useState(false)
  // Dizilim henüz kurulmamışsa (Kadro kurucu açılmadıysa) sahadaki ile aynı otomatik dizilimle doldurulur.
  const autoFilled = useRef('')
  useEffect(() => {
    const key = `${id}|${ws.formation?.id}`
    if (id !== undefined && ws.formation && !ws.stale && (squad.data?.length ?? 0) >= 11 && Object.keys(ws.state.assigned).length === 0 && autoFilled.current !== key) {
      autoFilled.current = key
      endpoints.lineup(id, ws.tactic).then((result) => ws.patch({ assigned: Object.fromEntries(result.slots.flatMap((s) => (s.playerId !== undefined ? [[s.slotId, s.playerId]] : []))) })).catch(() => undefined)
    }
  }, [id, ws, squad.data])
  const shortlist = useQuery({ queryKey: ['shortlist', id], queryFn: () => endpoints.shortlist(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const [selected, setSelected] = useState<string>()

  const needs = useMemo<Need[]>(() => {
    const weak = needsFromFits(fitRows, allSquad).map((r) => ({ key: `slot-${r.slotId}`, position: r.position, roleId: r.roleId, label: `${r.position} · ${r.roleName}`, detail: `${r.playerName} · ${levelText(r.display.pct)}`, state: r.display.state }))
    const gaps = depthRows(squad.data ?? []).filter((d) => d.short > 0).map((d) => ({ key: `depth-${d.group}`, ...TRANSFER_ROLE_BY_GROUP[d.group], label: `${GROUP_LABEL[d.group]} · derinlik`, detail: `${d.have}/${d.need} oyuncu` }))
    return [...weak, ...gaps]
  }, [fitRows, allSquad, squad.data])

  const wanted = params.get('pos')
  const need = needs.find((n) => n.key === selected) ?? needs.find((n) => n.position === wanted) ?? needs[0]

  const add = useMutation({ mutationFn: (item: CareerRecommendationItem) => endpoints.shortlistAdd(id!, item.player.id, { note: need?.label }), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })
  const remove = useMutation({ mutationFn: (playerId: number) => endpoints.shortlistRemove(id!, playerId), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })
  const setFee = useMutation({ mutationFn: ({ playerId, fee, note }: { playerId: number; fee?: number; note?: string }) => endpoints.shortlistAdd(id!, playerId, { maxFeeEur: fee, note }), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })

  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const starters = useMemo(() => new Set(fitRows.map((r) => r.playerId)), [fitRows])
  const sellPlan = useMemo(
    () => (squad.data ?? []).filter((c) => !c.loanedOut && !starters.has(c.player.id) && (tags[c.player.id] === 'FOR_SALE' || (c.player.age ?? 0) >= 29) && (c.player.valueEur ?? 0) > 0)
      .sort((a, b) => (b.player.valueEur ?? 0) - (a.player.valueEur ?? 0)).slice(0, 6),
    [squad.data, starters, tags],
  )

  const inList = new Set((shortlist.data ?? []).map((s) => s.playerId))
  const spend = (shortlist.data ?? []).reduce((sum, s) => sum + (s.maxFeeEur ?? 0), 0)
  const income = sellPlan.reduce((sum, c) => sum + (c.player.valueEur ?? 0) * 0.8, 0)
  // Bütçe girilmemişse bilinmiyor (0 değil, ENG-02): dönem sonu bütçe de bilinmez.
  const budget = career?.budgetEur ?? undefined
  const after = budget === undefined ? undefined : budget + income - spend

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career) {
    return <Card title="Transfer Merkezi"><EmptyState action={<Link to="/career/new" className="rounded-md bg-accent-bg px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>Önce bir kariyer başlat.</EmptyState></Card>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-line bg-line">
        <Stat label="Bütçe" value={formatEur(budget)} />
        <Stat label="Satış planı (tahmini)" value={income > 0 ? formatEur(Math.round(income)) : '—'} />
        <Stat label="Kısa liste tavanı" value={spend > 0 ? formatEur(spend) : '—'} />
        <Stat label="Dönem sonu bütçe" value={after === undefined ? '—' : formatEur(Math.round(after))} tone={after === undefined ? undefined : after < 0 ? 'bad' : 'good'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="İhtiyaçlar" actions={<span className="flex items-center gap-2"><Chip pressed={allSquad} onClick={() => setAllSquad((v) => !v)}>Tüm kadro</Chip><HelpPopover>Zayıf halka: sahadaki rozeti sarı ya da kırmızı olan oyuncular (seviyesine göre), en zayıf başta. Derinlik açıkları da gelir.</HelpPopover></span>}>
          {needs.length === 0 ? <EmptyState>{fitsPending ? 'Hesaplanıyor…' : allSquad ? 'Dizilimde oyuncu yok.' : 'Zayıf halka yok: dizilimdeki herkes seviyesinde ya da üstünde.'}</EmptyState> : (
            <ul className="space-y-1.5">
              {needs.map((n) => (
                <li key={n.key}>
                  <button type="button" aria-pressed={need?.key === n.key} onClick={() => setSelected(n.key)}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm ${need?.key === n.key ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'}`}>
                    <span className="flex items-center justify-between gap-2"><b>{n.label}</b>{n.state && <FitBadge state={n.state} compact />}</span><span className="text-xs text-muted">{n.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={need ? `Öneriler · ${need.position}` : "Öneriler"}>
          {need ? (
            <RecommendationPanel
              key={need.key}
              careerId={id}
              position={need.position}
              roleId={need.roleId}
              rowAction={(item) => (
                <Button variant={inList.has(item.player.id) ? "secondary" : "primary"} onClick={() => (inList.has(item.player.id) ? remove.mutate(item.player.id) : add.mutate(item))} aria-pressed={inList.has(item.player.id)}>
                  <Star size={14} aria-hidden="true" fill={inList.has(item.player.id) ? "currentColor" : "none"} /> {inList.has(item.player.id) ? "Listede" : "Kısa liste"}
                </Button>
              )}
            />
          ) : (
            <EmptyState>Soldan bir ihtiyaç seç.</EmptyState>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Kısa liste (${shortlist.data?.length ?? 0})`}>
          {(shortlist.data ?? []).length === 0 ? <EmptyState>Aday yıldızla ve pazarlık tavanını yaz.</EmptyState> : (
            <ul className="space-y-2">
              {(shortlist.data ?? []).map((s) => (
                <li key={s.playerId} className="flex flex-wrap items-end justify-between gap-2 text-sm">
                  <ShortlistLabel item={s} />
                  <div className="flex items-end gap-2">
                    <Field label="Tavan"><MoneyInput key={s.playerId} className="w-60" value={s.maxFeeEur ?? undefined} onChange={() => undefined} onCommit={(fee) => setFee.mutate({ playerId: s.playerId, fee, note: s.note })} /></Field>
                    <Button variant="ghost" onClick={() => remove.mutate(s.playerId)}>Çıkar</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Satış planı">
          {sellPlan.length === 0 ? <EmptyState>Satılık işaretli ya da ilk 11 dışı 29+ yaş oyuncu yok.</EmptyState> : (
            <ul className="divide-y divide-line text-sm">
              {sellPlan.map((c) => (
                <li key={c.player.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{c.player.name} <span className="text-xs text-muted">{c.player.age} yaş · {c.player.positions[0]}{tags[c.player.id] === 'FOR_SALE' ? ' · satılık' : ''}</span></span>
                  <span className="num text-xs">{formatEur(Math.round((c.player.valueEur ?? 0) * 0.8))} <span className="text-muted">(değerin %80'i)</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
