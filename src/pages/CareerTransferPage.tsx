import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Acquisition, TransferTarget } from '../api/types'
import { CompareButton } from '../components/CompareButton'
import { MoneyInput } from '../components/MoneyInput'
import { Button, Card, EmptyState, ErrorBox, Field, HelpPopover, Pill, Skeleton, Stat } from '../components/ui'
import { depthRows, GROUP_LABEL, weakSlots, type PositionGroup } from '../lib/deskRules'
import { formatEur } from '../lib/format'
import { toTacticRequest, useTactic } from '../state/tacticStore'
import { useActiveCareerId } from '../state/careerStore'

const ACQ: Record<Acquisition, { label: string; tone: 'emerald' | 'sky' | 'amber' }> = {
  FREE: { label: 'Bedava', tone: 'emerald' },
  LOAN: { label: 'Kiralık', tone: 'sky' },
  BUY: { label: 'Satın al', tone: 'amber' },
}

const GROUP_POSITION: Record<PositionGroup, { position: string; roleId: string }> = {
  GK: { position: 'GK', roleId: 'goalkeeper_defend' },
  CB: { position: 'CB', roleId: 'defender_defend' },
  FB: { position: 'LB', roleId: 'fullback_defend' },
  MID: { position: 'CM', roleId: 'box_to_box_support' },
  W: { position: 'RW', roleId: 'winger_attack' },
  ST: { position: 'ST', roleId: 'poacher_attack' },
}

interface Need {
  key: string
  position: string
  roleId: string
  label: string
  detail: string
}

/** Transfer Merkezi (CAR-23): ihtiyaçlar → adaylar → kısa liste ve bütçe simülatörü; satış planı etiketlenen/yaşlı yedeklerden gelir. */
export function CareerTransferPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const [params] = useSearchParams()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const tactic = useTactic()
  const request = toTacticRequest(tactic)
  const squad = useQuery({ queryKey: ['squad', id], queryFn: () => endpoints.squad(id!), enabled: id !== undefined })
  const lineup = useQuery({ queryKey: ['lineup', id, squad.data?.length, JSON.stringify(request)], queryFn: () => endpoints.lineup(id!, request), enabled: id !== undefined && (squad.data?.length ?? 0) >= 11, retry: false })
  const shortlist = useQuery({ queryKey: ['shortlist', id], queryFn: () => endpoints.shortlist(id!), enabled: id !== undefined, retry: false })
  const tagList = useQuery({ queryKey: ['tags', id], queryFn: () => endpoints.playerTags(id!), enabled: id !== undefined, retry: false })
  const [selected, setSelected] = useState<string>()

  const needs = useMemo<Need[]>(() => {
    const weak = weakSlots(lineup.data?.slots ?? []).map((w) => ({ key: `slot-${w.slotId}`, position: w.position, roleId: w.roleId, label: `${w.position} · zayıf halka`, detail: `${w.playerName ?? 'boş'} · RoleFit %${w.fit}` }))
    const gaps = depthRows(squad.data ?? []).filter((d) => d.short > 0).map((d) => ({ key: `depth-${d.group}`, ...GROUP_POSITION[d.group], label: `${GROUP_LABEL[d.group]} · derinlik`, detail: `${d.have}/${d.need} oyuncu` }))
    return [...weak, ...gaps]
  }, [lineup.data, squad.data])

  const wanted = params.get('pos')
  const need = needs.find((n) => n.key === selected) ?? needs.find((n) => n.position === wanted) ?? needs[0]

  const targets = useQuery({
    queryKey: ['transfer-targets', id, need?.position, need?.roleId],
    queryFn: () => endpoints.transferTargets({ careerId: id!, perPosition: 6, slots: [{ position: need!.position, roleId: need!.roleId }] }),
    enabled: id !== undefined && need !== undefined,
    retry: false,
  })
  const candidates: TransferTarget[] = targets.data?.positions[0]?.targets ?? []

  const add = useMutation({ mutationFn: (t: TransferTarget) => endpoints.shortlistAdd(id!, t.player.id, { note: need?.label }), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })
  const remove = useMutation({ mutationFn: (playerId: number) => endpoints.shortlistRemove(id!, playerId), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })
  const setFee = useMutation({ mutationFn: ({ playerId, fee, note }: { playerId: number; fee?: number; note?: string }) => endpoints.shortlistAdd(id!, playerId, { maxFeeEur: fee, note }), onSuccess: () => client.invalidateQueries({ queryKey: ['shortlist', id] }) })

  const tags = useMemo(() => Object.fromEntries((tagList.data ?? []).map((t) => [t.playerId, t.tag])), [tagList.data])
  const starters = useMemo(() => new Set((lineup.data?.slots ?? []).flatMap((s) => (s.playerId ? [s.playerId] : []))), [lineup.data])
  const sellPlan = useMemo(
    () => (squad.data ?? []).filter((c) => !c.loanedOut && !starters.has(c.player.id) && (tags[c.player.id] === 'FOR_SALE' || (c.player.age ?? 0) >= 29) && (c.player.valueEur ?? 0) > 0)
      .sort((a, b) => (b.player.valueEur ?? 0) - (a.player.valueEur ?? 0)).slice(0, 6),
    [squad.data, starters, tags],
  )

  const inList = new Set((shortlist.data ?? []).map((s) => s.playerId))
  const spend = (shortlist.data ?? []).reduce((sum, s) => sum + (s.maxFeeEur ?? 0), 0)
  const income = sellPlan.reduce((sum, c) => sum + (c.player.valueEur ?? 0) * 0.8, 0)
  const budget = career?.budgetEur ?? 0
  const after = budget + income - spend

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
        <Stat label="Satış planı (tahmini)" value={formatEur(Math.round(income))} />
        <Stat label="Kısa liste tavanı" value={formatEur(spend)} />
        <Stat label="Dönem sonu bütçe" value={formatEur(Math.round(after))} tone={after < 0 ? 'bad' : 'good'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="İhtiyaçlar" actions={<HelpPopover>Zayıf halkalar (RoleFit %70 altı) ve derinlik açıkları otomatik gelir.</HelpPopover>}>
          {needs.length === 0 ? <EmptyState>{lineup.isLoading ? 'Hesaplanıyor…' : 'Acil ihtiyaç yok.'}</EmptyState> : (
            <ul className="space-y-1.5">
              {needs.map((n) => (
                <li key={n.key}>
                  <button type="button" aria-pressed={need?.key === n.key} onClick={() => setSelected(n.key)}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm ${need?.key === n.key ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'}`}>
                    <b className="block">{n.label}</b><span className="text-xs text-muted">{n.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={need ? `Adaylar · ${need.position}` : 'Adaylar'}>
          {targets.isLoading && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          <ErrorBox error={targets.error} />
          {!targets.isLoading && candidates.length === 0 && <EmptyState>{need ? 'Bu ihtiyaç için aday bulunamadı.' : 'Soldan bir ihtiyaç seç.'}</EmptyState>}
          <ul className="divide-y divide-line">
            {candidates.map((t) => (
              <li key={t.player.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link to={`/players/${t.player.id}`} className="font-semibold underline decoration-dotted underline-offset-2">{t.player.name}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span className="num">{t.player.overall}</span><span>{t.player.positions.slice(0, 3).join(', ')}</span>
                    {t.player.age && <span>{t.player.age} yaş</span>}<span>{t.player.club}</span>
                    <Pill tone={ACQ[t.acquisition].tone}>{ACQ[t.acquisition].label}</Pill>
                    <span className="num">RoleFit %{Math.round(t.roleFit.score)}</span>
                    {t.player.valueEur !== undefined && <span>{formatEur(t.player.valueEur)}</span>}
                  </div>
                  <p className="text-xs text-muted">{t.reason}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CompareButton compact entry={{ id: t.player.id, name: t.player.name, overall: t.player.overall, position: t.player.positions[0] ?? '' }} />
                  <Button variant={inList.has(t.player.id) ? 'secondary' : 'primary'} onClick={() => (inList.has(t.player.id) ? remove.mutate(t.player.id) : add.mutate(t))} aria-pressed={inList.has(t.player.id)}>
                    <Star size={14} aria-hidden="true" fill={inList.has(t.player.id) ? 'currentColor' : 'none'} /> {inList.has(t.player.id) ? 'Listede' : 'Kısa liste'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Kısa liste (${shortlist.data?.length ?? 0})`}>
          {(shortlist.data ?? []).length === 0 ? <EmptyState>Aday yıldızla ve pazarlık tavanını yaz.</EmptyState> : (
            <ul className="space-y-2">
              {(shortlist.data ?? []).map((s) => (
                <li key={s.playerId} className="flex flex-wrap items-end justify-between gap-2 text-sm">
                  <Link to={`/players/${s.playerId}`} className="underline decoration-dotted">Oyuncu #{s.playerId}{s.note ? ` · ${s.note}` : ''}</Link>
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
