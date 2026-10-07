import { useMemo, useState } from 'react'
import { Button, Card, EmptyState, Field, Input, Pill, Select } from '../components/ui'
import { estimateEffort, parseRequirement, planObjectives, rewardOf, xiToText, type Objective, type ObjectiveGroup, type PlanGroup, type Requirement } from '../lib/objectives'
import { objectiveStore, useObjectives } from '../state/objectiveStore'

const GROUPS: ObjectiveGroup[] = ['Foundations', 'Milestones', 'Weekly', 'Seasonal', 'Diğer']

export function UtObjectivesPage() {
  const objectives = useObjectives()
  const plan = useMemo(() => planObjectives(objectives), [objectives])
  const [name, setName] = useState('')
  const [group, setGroup] = useState<ObjectiveGroup>('Weekly')
  const [requirements, setRequirements] = useState('')
  const [reward, setReward] = useState('')
  const [sp, setSp] = useState('')
  const [effort, setEffort] = useState('')
  const [expires, setExpires] = useState('')
  const [web, setWeb] = useState(false)
  const [error, setError] = useState<string>()

  function add() {
    const lines = requirements.split('\n').map((l) => l.trim()).filter(Boolean)
    const parsed = lines.map(parseRequirement)
    if (!name.trim()) {
      setError('Objective adı gerekli.')
      return
    }
    if (parsed.some((p) => !p)) {
      setError('Şart satırı biçimi: TÜR:ad:sayı (ör. XI_LEAGUE:Premier League:1) ya da TÜR:sayı (ör. GOALS:3).')
      return
    }
    setError(undefined)
    objectiveStore.add({
      id: `${Date.now()}`,
      name: name.trim(),
      group,
      requirements: parsed as Requirement[],
      rewardValue: Number(reward) || 0,
      sp: Number(sp) || 0,
      effortMatches: effort === '' ? undefined : Number(effort),
      webAppDoable: web,
      expiresAt: expires || undefined,
    })
    setName('')
    setRequirements('')
  }

  return (
    <div className="space-y-4">
      <Card title="Objective ekle">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Objective'ler için resmi bir veri akışı yok; kendi objective'lerini gir (ileride extension doldurabilir). Planlayıcı hepsini birlikte değerlendirir.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ad"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Grup">
            <Select value={group} onChange={(e) => setGroup(e.target.value as ObjectiveGroup)}>
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="Bitiş tarihi"><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
          <Field label="Ödül değeri (coin tahmini)"><Input type="number" min={0} value={reward} onChange={(e) => setReward(e.target.value)} /></Field>
          <Field label="SP"><Input type="number" min={0} value={sp} onChange={(e) => setSp(e.target.value)} /></Field>
          <Field label="Tahmini maç (boşsa şartlardan)"><Input type="number" min={0} step="0.5" value={effort} onChange={(e) => setEffort(e.target.value)} /></Field>
        </div>
        <Field label="Şartlar (her satır bir şart)">
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={3}
            placeholder={'XI_LEAGUE:Premier League:1\nGOALS:3'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </Field>
        <p className="mt-1 text-xs text-slate-500">Türler: XI_LEAGUE, XI_NATION, XI_CLUB, GOALS, ASSISTS, PLAY_MATCHES, SBC, EVO, SQUAD_ACTION, OTHER.</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} /> Web App / Companion'da yapılabilir (maç gerekmez)
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
        <Button className="mt-3" onClick={add}>Ekle</Button>
      </Card>

      <Card title={`Objective'ler (${objectives.length})`} actions={objectives.length > 0 ? <Button variant="ghost" onClick={() => objectiveStore.clear()}>Hepsini sil</Button> : undefined}>
        {objectives.length === 0 ? (
          <EmptyState>Henüz objective yok.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-1.5">
                <span>
                  <b>{o.name}</b> <span className="text-xs text-slate-500">{o.group}{o.expiresAt ? ` · ${o.expiresAt}` : ''} · ödül {rewardOf(o)} · ~{estimateEffort(o)} maç{o.webAppDoable ? ' · web' : ''}</span>
                </span>
                <Button variant="ghost" onClick={() => objectiveStore.remove(o.id)}>Sil</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {objectives.length > 0 && <PlanView groups={plan.groups} web={plan.web} total={plan.totalReward} />}
    </div>
  )
}

function PlanView({ groups, web, total }: { groups: PlanGroup[]; web: Objective[]; total: number }) {
  return (
    <Card title="Önerilen plan">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Toplam ödül tahmini: <b>{total}</b>. Gruplar süresi dolana göre, sonra ödül/çaba oranına göre sıralıdır.</p>
      <ol className="space-y-3">
        {web.length > 0 && (
          <li className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-600">
            <div className="mb-1 flex items-center gap-2"><Pill tone="sky">Web App / Companion</Pill><span className="text-xs text-slate-500">maç gerekmez, önce bunları yap</span></div>
            <ul className="list-disc pl-5">
              {web.map((o) => (
                <li key={o.id}>{o.name}{o.expiresAt ? ` (${o.expiresAt})` : ''}</li>
              ))}
            </ul>
          </li>
        )}
        {groups.map((g, i) => (
          <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-600">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Pill tone="emerald">Grup {i + 1}</Pill>
              <Pill tone="slate">~{g.effortMatches} maç</Pill>
              <Pill tone="amber">ödül {g.reward}</Pill>
              {g.earliestExpiry && <Pill tone="rose">son {g.earliestExpiry}</Pill>}
            </div>
            <ul className="list-disc pl-5">
              {g.objectives.map((o) => (
                <li key={o.id}>{o.name}</li>
              ))}
            </ul>
            {g.xi.length > 0 && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Ortak XI şartı ({g.xiSlots} slot): <span className="font-mono">{xiToText(g.xi)}</span> — SBC çözücüdeki "XI şartları" alanına yapıştırarak bu şartı sağlayan 11'i bulabilirsin.
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-500">Grup çabası, üyelerin en büyüğü olarak alınır (hedeflerin aynı maçlarda birikeceği varsayımı). Ödül değerleri senin girdiğin tahminlerdir; SP için sabit bir katsayı kullanılır.</p>
    </Card>
  )
}
