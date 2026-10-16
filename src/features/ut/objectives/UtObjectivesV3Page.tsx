import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpPopover, Input, Select } from '../../../components/ui'
import { timeLeft } from '../../../lib/timeLeft'
import { PageHeader } from '../../../design/components/PageHeader'
import { Button, Chip, EmptyState, ErrorState, Panel, Skeleton } from '../../../design/components/primitives'
import { estimateEffort, objectiveLabel, rewardOf, xiToText, type Objective, type ObjectiveGroup, type PlanGroup } from '../../../lib/objectives'
import { objectiveStore } from '../../../state/objectiveStore'
import { addObjective, OBJECTIVE_GROUPS, useUtObjectives, type ObjectiveInput, type ParentGroup } from './useUtObjectives'

const NUM = 'font-[var(--font-num)] tabular-nums'
const coin = (v: number) => v.toLocaleString('tr-TR')
const dateText = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('tr-TR') : undefined)

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs text-ink-2">
      <div role="progressbar" aria-label="İlerleme" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--glass-3)]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className={NUM}>{done}/{total}</span>
    </div>
  )
}

function TaskRow({ o, showIndex }: { o: Objective; showIndex?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0">
        {showIndex && <span className={`mr-1 text-xs text-ink-2 ${NUM}`}>{o.subIndex}/{o.subTotal}</span>}
        <span className="font-medium">{o.name}</span>
        <span className="block text-xs text-ink-2">Ödül {coin(rewardOf(o))} · ~{estimateEffort(o)} maç{o.webAppDoable ? ' · Web App' : ''}</span>
      </span>
      <Button variant="ghost" aria-label={`Sil: ${o.name}`} onClick={() => objectiveStore.remove(o.id)}><Trash2 size={16} aria-hidden="true" /><span className="max-sm:sr-only">Sil</span></Button>
    </li>
  )
}

function GroupCard({ g }: { g: ParentGroup }) {
  const left = g.expiresAt ? timeLeft(g.expiresAt) : undefined
  return (
    <article aria-label={g.name} className="glass-3 flex flex-col gap-2 rounded-[var(--radius-sm)] p-3 text-sm">
      <header className="flex flex-wrap items-center gap-1.5">
        <h3 className="mr-auto font-semibold">{g.name}</h3>
        <Chip>{g.group}</Chip>
        {g.reward > 0 && <Chip tone="good">Ana ödül {coin(g.reward)}</Chip>}
        {g.expiresAt && <Chip tone={left?.urgent ? 'bad' : undefined}>Bitiş {dateText(g.expiresAt)}</Chip>}
      </header>
      {g.total > 0 && <Progress done={g.done} total={g.total} />}
      <ol aria-label="Görevler" className="divide-y divide-[var(--glass-border)]">{g.items.map((o) => <TaskRow key={o.id} o={o} showIndex />)}</ol>
    </article>
  )
}

function AddForm() {
  const [input, setInput] = useState<ObjectiveInput>({ name: '', group: 'Weekly', requirements: '', reward: '', sp: '', effort: '', expires: '', web: false })
  const [error, setError] = useState<string>()
  const set = (patch: Partial<ObjectiveInput>) => setInput((i) => ({ ...i, ...patch }))
  const label = 'flex flex-col gap-1 text-xs font-medium text-muted'
  return (
    <details className="glass p-4">
      <summary className="min-h-8 cursor-pointer font-display text-xl font-semibold max-sm:min-h-11">Objective ekle</summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>Ad<Input value={input.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className={label}>Grup<Select value={input.group} onChange={(e) => set({ group: e.target.value as ObjectiveGroup })}>{OBJECTIVE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</Select></label>
          <label className={label}>Bitiş tarihi<Input type="date" value={input.expires} onChange={(e) => set({ expires: e.target.value })} /></label>
          <label className={label}>Ödül değeri (coin tahmini)<Input type="number" min={0} value={input.reward} onChange={(e) => set({ reward: e.target.value })} /></label>
          <label className={label}>SP<Input type="number" min={0} value={input.sp} onChange={(e) => set({ sp: e.target.value })} /></label>
          <label className={label}>Tahmini maç (boşsa şartlardan)<Input type="number" min={0} step="0.5" value={input.effort} onChange={(e) => set({ effort: e.target.value })} /></label>
        </div>
        <label className={label}>
          <span className="flex items-center gap-1">Şartlar (her satır bir şart)<HelpPopover label="Şart türleri">Türler: XI_LEAGUE, XI_NATION, XI_CLUB, GOALS, ASSISTS, PLAY_MATCHES, SBC, EVO, SQUAD_ACTION, OTHER. Biçim TÜR:ad:sayı ya da TÜR:sayı.</HelpPopover></span>
          <textarea value={input.requirements} onChange={(e) => set({ requirements: e.target.value })} rows={3} placeholder={'XI_LEAGUE:Premier League:1\nGOALS:3'} className="glass-3 w-full rounded-[var(--radius-sm)] px-3 py-2 font-[var(--font-num)] text-sm text-ink" />
        </label>
        <label className="flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" checked={input.web} onChange={(e) => set({ web: e.target.checked })} className="size-4 accent-[var(--accent)]" /> Web App / Companion'da yapılabilir (maç gerekmez)</label>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button variant="primary" className="self-start" onClick={() => {
          const message = addObjective(input)
          setError(message)
          if (!message) {
            set({ name: '', requirements: '' })
          }
        }}>Ekle</Button>
      </div>
    </details>
  )
}

function PlanView({ groups, web, total }: { groups: PlanGroup[]; web: Objective[]; total: number }) {
  return (
    <Panel title={<span className="flex items-center gap-1.5">Önerilen plan<HelpPopover label="Plan nasıl sıralanır">Gruplar süresi dolana, sonra ödül/çaba oranına göre sıralıdır. Grup çabası üyelerin en büyüğüdür (hedefler aynı maçlarda birikir). Ödüller senin tahminlerindir; SP için sabit katsayı kullanılır.</HelpPopover></span>} actions={<Chip tone="good">Toplam ödül {coin(total)}</Chip>}>
      <ol className="flex flex-col gap-2">
        {web.length > 0 && (
          <li className="glass-3 rounded-[var(--radius-sm)] p-3 text-sm">
            <p className="mb-1 flex flex-wrap items-center gap-1.5"><Chip tone="info">Web App / Companion</Chip><span className="text-xs text-ink-2">Maç gerekmez, önce bunlar</span></p>
            <ul className="list-disc pl-5">{web.map((o) => <li key={o.id}>{objectiveLabel(o)}{o.expiresAt ? ` (${dateText(o.expiresAt)})` : ''}</li>)}</ul>
          </li>
        )}
        {groups.map((g, i) => (
          <li key={i} className="glass-3 rounded-[var(--radius-sm)] p-3 text-sm">
            <p className="mb-1 flex flex-wrap items-center gap-1.5">
              <Chip tone="good">Grup {i + 1}</Chip><Chip>~{g.effortMatches} maç</Chip><Chip>Ödül {coin(g.reward)}</Chip>
              {g.earliestExpiry && <Chip tone="bad">Son {dateText(g.earliestExpiry)}</Chip>}
            </p>
            <ul className="list-disc pl-5">{g.objectives.map((o) => <li key={o.id}>{objectiveLabel(o)}</li>)}</ul>
            {g.xi.length > 0 && <p className="mt-1 text-xs text-ink-2">Ortak XI şartı ({g.xiSlots} slot): <span className={NUM}>{xiToText(g.xi)}</span> — SBC çözücüdeki "XI şartları" alanına yapıştır.</p>}
          </li>
        ))}
      </ol>
    </Panel>
  )
}

/**
 * v3 Objective planı (/ut/objectives, V3-07c; 11 §9 Pano): güncel gruplar (KB; görev listesi, planlayıcıya aktar), senin grupların (yakalamadan:
 * ilerleme, ana ödül, bitiş — veride varsa), tekil objective'ler, önerilen plan ve elle ekleme. Ödül/bitiş/ilerleme yalnız veride varsa gösterilir.
 */
export function UtObjectivesV3Page() {
  const { objectives, plan, parents, singles, kb, importKb } = useUtObjectives()
  const kbGroups = kb.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 py-2">
      <PageHeader title="Objective planı" subtitle="Grupları gör, ilerlemeni takip et, en verimli sırayı çıkar." actions={objectives.length > 0 ? <Button variant="ghost" onClick={() => objectiveStore.clear()}>Hepsini sil</Button> : undefined} />

      {kb.isLoading ? (
        <Skeleton className="h-32" />
      ) : kb.isError ? (
        <Panel title="Güncel gruplar"><ErrorState message="Güncel objective grupları yüklenemedi." onRetry={() => kb.refetch()} /></Panel>
      ) : kbGroups.length > 0 && (
        <Panel title={`Güncel gruplar (${kbGroups.length})`} actions={<Button onClick={importKb}>Planlayıcıya aktar</Button>}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kbGroups.map((g) => {
              const left = g.endsAt ? timeLeft(g.endsAt) : undefined
              return (
                <article key={g.id} aria-label={g.name} className="glass-3 flex flex-col gap-2 rounded-[var(--radius-sm)] p-3 text-sm">
                  <header className="flex flex-wrap items-center gap-1.5">
                    <h3 lang="en" className="mr-auto font-semibold">{g.name}</h3>
                    <Chip>{g.objectives.length} görev</Chip>
                    {left && <Chip tone={left.urgent ? 'bad' : undefined}>{left.text}</Chip>}
                  </header>
                  <ol aria-label="Görevler" className="list-decimal space-y-0.5 pl-5 text-ink-2">{g.objectives.slice(0, 6).map((o) => <li key={o.id}>{o.name ?? o.description}</li>)}</ol>
                </article>
              )
            })}
          </div>
        </Panel>
      )}

      {objectives.length === 0 && kbGroups.length === 0 && !kb.isLoading ? (
        <EmptyState action={<Link to="/ut/import" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Kulübümü senkronla</Link>}>Henüz objective yok. Kulübünü senkronlarsan grupların ilerlemesiyle gelir; aşağıdan elle de ekleyebilirsin.</EmptyState>
      ) : objectives.length > 0 && (
        <Panel title={`Senin objective'lerin (${objectives.length})`}>
          <div className="flex flex-col gap-2">
            {parents.length > 0 && <div className="grid gap-2 lg:grid-cols-2">{parents.map((g) => <GroupCard key={g.id} g={g} />)}</div>}
            {singles.length > 0 && <ul aria-label="Tekil objective'ler" className="divide-y divide-[var(--glass-border)] text-sm">{singles.map((o) => <TaskRow key={o.id} o={o} />)}</ul>}
          </div>
        </Panel>
      )}

      <AddForm />
      {objectives.length > 0 && <PlanView groups={plan.groups} web={plan.web} total={plan.totalReward} />}
    </div>
  )
}
