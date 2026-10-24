import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, Clock, Pause, Star } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, PlayerTag, PlayerTagKind } from '../../api/types'
import { MoneyInput } from '../../components/MoneyInput'
import { HelpPopover } from '../../components/ui'
import { Chip, EmptyState, Segmented } from '../../design/components/primitives'
import { sellAdvice, type SellAdvice } from '../../lib/deskRules'
import { formatEur } from '../../lib/format'
import { contractMonthsLeft } from './transferPlan'

const ADVICE: Record<SellAdvice['kind'], { label: string; icon: typeof Star; order: number }> = {
  SELL: { label: 'Sat', icon: ArrowDownRight, order: 0 },
  LOAN: { label: 'Kirala', icon: Clock, order: 1 },
  KEEP: { label: 'Tut', icon: Pause, order: 2 },
}
type PlanChoice = 'sell' | 'loan' | 'keep'
const PLAN_OPTIONS: { id: PlanChoice; label: string }[] = [
  { id: 'sell', label: 'Satışa koy' },
  { id: 'loan', label: 'Kiralığa aç' },
  { id: 'keep', label: 'Tut' },
]
const PLAN_TAG: Record<Exclude<PlanChoice, 'keep'>, PlayerTagKind> = { sell: 'FOR_SALE', loan: 'LOAN_OK' }
const choiceOf = (tag?: PlayerTag): PlanChoice => (tag?.tag === 'FOR_SALE' ? 'sell' : tag?.tag === 'LOAN_OK' ? 'loan' : 'keep')
const NUM = 'font-[var(--font-num)] tabular-nums'

const valueOf = (c: CareerPlayer) => c.valueEur ?? c.player.valueEur
const valueText = (c: CareerPlayer) => {
  const value = valueOf(c)
  return value === undefined ? undefined : `${c.player.valuationEstimated && c.valueEur === undefined ? '≈' : ''}${formatEur(value)}`
}
const dateText = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const contractText = (gameDate: string | undefined, until: string) => {
  const months = contractMonthsLeft(gameDate, until)
  return `${dateText(until)}${months === undefined ? '' : ` · ${months} ay`}`
}

interface Row {
  c: CareerPlayer
  advice: SellAdvice
  tag?: PlayerTag
}

/**
 * Transfer › Satış (KARIYER-UX FAZ 5, 15 §4.4, §7.2): öneriler (`sellAdvice`, Masa kuralları) + kalıcı plan "Satışa koy / Kiralığa aç / Tut"
 * ve istenen bedel. Plan etiket olarak saklanır (FOR_SALE / LOAN_OK + `askingPriceEur`); "Tut" plan etiketini kaldırır, diğer etiketlere dokunmaz.
 * `focusId` (Masa satış bağlantısı `?oyuncu=`) o oyuncunun satırını açar, işaretler ve görünür yapar.
 */
export function SellPlanTab({ careerId, squad, tags, starters, gameDate, focusId }: {
  careerId: number; squad: CareerPlayer[]; tags: PlayerTag[]; starters: Set<number>; gameDate?: string; focusId?: number
}) {
  const client = useQueryClient()
  const tagById = useMemo(() => new Map(tags.map((t) => [t.playerId, t])), [tags])
  const rows = useMemo<Row[]>(() => {
    const kinds = Object.fromEntries(tags.map((t) => [t.playerId, t.tag]))
    return squad.map((c) => ({ c, advice: sellAdvice(c, starters, kinds), tag: tagById.get(c.player.id) }))
      .sort((a, b) => ADVICE[a.advice.kind].order - ADVICE[b.advice.kind].order || (valueOf(b.c) ?? 0) - (valueOf(a.c) ?? 0))
  }, [squad, starters, tags, tagById])
  const invalidate = () => client.invalidateQueries({ queryKey: ['tags', careerId] })
  const save = useMutation({
    mutationFn: ({ playerId, tag, price }: { playerId: number; tag: PlayerTagKind; price?: number }) =>
      (price === undefined ? endpoints.setPlayerTag(careerId, playerId, tag) : endpoints.setPlayerTag(careerId, playerId, tag, price)),
    onSuccess: invalidate,
  })
  const clear = useMutation({ mutationFn: (playerId: number) => endpoints.clearPlayerTag(careerId, playerId), onSuccess: invalidate })
  const choose = (row: Row, choice: PlanChoice) => {
    if (choice === choiceOf(row.tag)) {
      return
    }
    if (choice === 'keep') {
      clear.mutate(row.c.player.id)
    } else {
      save.mutate({ playerId: row.c.player.id, tag: PLAN_TAG[choice] })
    }
  }

  if (rows.length === 0) {
    return <EmptyState>Kadroda oyuncu yok.</EmptyState>
  }
  const active = rows.filter((r) => r.advice.kind !== 'KEEP')
  const kept = rows.filter((r) => r.advice.kind === 'KEEP')
  const showContract = gameDate !== undefined && rows.some(({ c }) => c.player.contractUntil)
  const list = (items: Row[]) => (
    <ul className="flex flex-col gap-2">
      {items.map((row) => (
        <PlanRow key={row.c.player.id} row={row} focused={row.c.player.id === focusId} showContract={showContract} gameDate={gameDate}
          onChoose={(choice) => choose(row, choice)} onPrice={(price) => save.mutate({ playerId: row.c.player.id, tag: 'FOR_SALE', price })} />
      ))}
    </ul>
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">Öneri Masa kurallarıyla; plan senin kararın ve kariyerde saklanır.</p>
        <HelpPopover label="Satış planı">Öneri: ilk 11 dışı ve satılık işaretli ya da 29+ yaş → sat; ilk 11 dışı, 21 yaş ve altı, potansiyeli 6+ puan üstünde → kirala; diğerleri tut. Plan: "Satışa koy" bütçe planına istenen bedelle (yoksa değerle) gelir olarak girer.</HelpPopover>
      </div>
      {active.length > 0 ? list(active) : <p className="text-sm text-ink-2">Satış ya da kiralama önerisi yok.</p>}
      {kept.length > 0 && (
        <details className="text-sm" open={kept.some((r) => r.c.player.id === focusId) || undefined}>
          <summary className="min-h-8 cursor-pointer font-semibold text-accent max-sm:min-h-11">Tut olarak kalanlar ({kept.length})</summary>
          <div className="pt-2">{list(kept)}</div>
        </details>
      )}
    </div>
  )
}

function PlanRow({ row, focused, showContract, gameDate, onChoose, onPrice }: {
  row: Row; focused: boolean; showContract: boolean; gameDate?: string; onChoose: (choice: PlanChoice) => void; onPrice: (price?: number) => void
}) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (focused) {
      ref.current?.scrollIntoView?.({ block: 'center' })
    }
  }, [focused])
  const { c, advice, tag } = row
  const { label, icon: Icon } = ADVICE[advice.kind]
  const choice = choiceOf(tag)
  const value = valueText(c)
  return (
    <li ref={ref} aria-current={focused || undefined}
      className={`glass-3 grid grid-cols-1 gap-2 p-2.5 text-sm min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:items-center ${focused ? 'ring-2 ring-accent' : ''}`}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/players/${c.player.id}`} className="font-semibold text-ink underline decoration-dotted underline-offset-2">{c.player.name}</Link>
          <Chip><Icon size={12} aria-hidden="true" />{label}</Chip>
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-ink-2">
          {value !== undefined && <span className={NUM}>Değer {value}</span>}
          {showContract && c.player.contractUntil && <span>Sözleşme {contractText(gameDate, c.player.contractUntil)}</span>}
        </p>
        <p className="text-xs text-muted">{advice.reason}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label={`Plan · ${c.player.name}`} value={choice} options={PLAN_OPTIONS} onChange={onChoose} />
        {choice === 'sell' && (
          <label className="flex flex-col gap-0.5 text-xs font-medium text-muted">
            İstenen bedel
            <MoneyInput key={`${c.player.id}-${tag?.askingPriceEur ?? ''}`} ariaLabel={`İstenen bedel · ${c.player.name}`} className="w-60"
              value={tag?.askingPriceEur ?? undefined} onChange={() => undefined} onCommit={onPrice} />
          </label>
        )}
      </div>
    </li>
  )
}
