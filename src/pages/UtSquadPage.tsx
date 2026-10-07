import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { PlayerSummary, TacticRequest, WeaponState } from '../api/types'
import { PitchView } from '../components/PitchView'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Pill, Select, Spinner } from '../components/ui'
import { MAX_SQUAD_CHEM, squadChemistry } from '../lib/chemistry'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']
const BUILD_UPS = ['Short', 'Balanced', 'Counter'] as const
const TIER_TONE: Record<string, 'emerald' | 'sky' | 'amber' | 'slate'> = { 'A+': 'emerald', A: 'sky', B: 'amber', C: 'slate' }

interface Setup {
  buildUp: (typeof BUILD_UPS)[number]
  depth: number
}

export function UtSquadPage() {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles, staleTime: 600_000 })
  const [formationId, setFormationId] = useState('4-2-3-1 (2)')
  const [setup, setSetup] = useState<Setup>({ buildUp: 'Balanced', depth: 55 })
  const [picked, setPicked] = useState<Record<string, PlayerSummary>>({})
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string>()
  const [picking, setPicking] = useState(false)

  const formation = formations.data?.find((f) => f.id === formationId) ?? formations.data?.[0]
  const slots = formation?.slots ?? []

  const tactic: TacticRequest = useMemo(
    () => ({
      formation: formation?.id,
      slots: Object.entries(roleOverride).map(([slotId, roleId]) => ({ slotId, tags: [], roleId })),
      setup,
    }),
    [formation?.id, roleOverride, setup],
  )
  const resolved = useQuery({
    queryKey: ['ut-resolve', JSON.stringify(tactic)],
    queryFn: () => endpoints.resolveTactic(tactic),
    enabled: Boolean(formation),
    retry: false,
  })
  const roleBySlot = Object.fromEntries((resolved.data?.slots ?? []).map((s) => [s.slotId, s]))

  const pickedSlots = slots.filter((s) => picked[s.slotId] && roleBySlot[s.slotId])
  const evaluationBody = pickedSlots.map((s) => ({ slotId: s.slotId, position: s.position, playerId: picked[s.slotId].id, roleId: roleBySlot[s.slotId].roleId }))
  const evaluation = useQuery({
    queryKey: ['ut-evaluate', JSON.stringify(evaluationBody), setup.buildUp, setup.depth],
    queryFn: () => endpoints.utSquadEvaluate({ slots: evaluationBody, setup }),
    enabled: evaluationBody.length > 0,
    retry: false,
    staleTime: 60_000,
  })
  const evalBySlot = Object.fromEntries((evaluation.data?.slots ?? []).map((e) => [e.slotId, e]))

  const chem = useMemo(
    () =>
      squadChemistry(
        slots.map((s) => {
          const p = picked[s.slotId]
          return { position: s.position, card: p ? { id: p.id, gender: p.gender, club: p.club, league: p.league, nationality: p.nationality, positions: p.positions } : undefined }
        }),
      ),
    [slots, picked],
  )

  const info = Object.fromEntries(
    slots.map((s, i) => {
      const p = picked[s.slotId]
      const e = evalBySlot[s.slotId]
      return [s.slotId, { title: p?.name, subtitle: p ? `${e ? `meta ${Math.round(e.card.metaRating)}` : p.overall} · k${chem.perSlot[i]}` : undefined, badge: p ? (e?.badge ?? CHEM_BADGE[chem.perSlot[i]]) : undefined }]
    }),
  )
  const active = slots.find((s) => s.slotId === selected)
  const activeIndex = active ? slots.indexOf(active) : -1
  const activeEval = active ? evalBySlot[active.slotId] : undefined
  const activeRoles = (roles.data ?? []).filter((r) => active && r.positions.includes(active.position)).sort((a, b) => a.name.localeCompare(b.name) || a.focus.localeCompare(b.focus))
  const filled = pickedSlots.length

  function changeFormation(id: string) {
    setFormationId(id)
    setPicked({})
    setRoleOverride({})
    setSelected(undefined)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,480px)_1fr]">
      <Card title="UT Taktik ve Kadro Kurucu">
        {formations.isLoading ? (
          <Spinner />
        ) : formations.error ? (
          <ErrorBox error={formations.error} />
        ) : (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <Field label="Formasyon">
                <Select value={formation?.id} onChange={(e) => changeFormation(e.target.value)}>
                  {(formations.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Build-Up">
                <Select value={setup.buildUp} onChange={(e) => setSetup((cur) => ({ ...cur, buildUp: e.target.value as Setup['buildUp'] }))}>
                  {BUILD_UPS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label={`Savunma hattı: ${setup.depth}`}>
                <Input type="range" min={0} max={100} value={setup.depth} onChange={(e) => setSetup((cur) => ({ ...cur, depth: Number(e.target.value) }))} />
              </Field>
            </div>
            <PitchView slots={slots} selected={selected} onSelect={setSelected} info={info} />
            <p className="mt-2 text-xs text-slate-500">Slota tıkla: rol ve focus seç, kart ata. Sahadaki "k" kimya, çerçeve RoleFit rozetidir.</p>
          </>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="Kadro özeti">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone={chem.total >= 30 ? 'emerald' : chem.total >= 20 ? 'amber' : 'rose'}>kimya {chem.total} / {MAX_SQUAD_CHEM}</Pill>
            <Pill tone="sky">meta* ort. {evaluation.data ? evaluation.data.averageMeta : '—'}</Pill>
            <Pill tone="slate">OVR ort. {evaluation.data ? evaluation.data.averageOverall : '—'}</Pill>
            <Pill tone="slate">{filled}/11 slot dolu</Pill>
            <Button variant="ghost" onClick={() => setPicked({})}>Kartları temizle</Button>
          </div>
          <Summary evaluation={evaluation.data?.slots ?? []} />
          <p className="mt-2 text-xs text-slate-500">
            Meta* platformun tahmin metriğidir. Kimya FC27 kurallarıyla hesaplanır (Icon/Hero kartı olmadığı için o kurallar devrede değil). Fiyat verisi olmadığından bütçe yok.
          </p>
        </Card>

        {active ? (
          <Card title={`${active.slotId} · ${active.position}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rol ve focus">
                <Select
                  value={roleBySlot[active.slotId]?.roleId ?? ''}
                  onChange={(e) => setRoleOverride((cur) => ({ ...cur, [active.slotId]: e.target.value }))}
                >
                  {activeRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} · {r.focus}</option>
                  ))}
                </Select>
              </Field>
              <div className="flex items-end">
                <Button variant="secondary" onClick={() => setPicking(true)}>{picked[active.slotId] ? `Kart: ${picked[active.slotId].name} (değiştir)` : 'Kart ata'}</Button>
              </div>
            </div>
            {picked[active.slotId] && (
              <div className="mt-3 space-y-1.5 text-sm">
                {activeEval ? (
                  <>
                    <p>
                      Meta rating* <b className="text-lg tabular-nums">{activeEval.card.metaRating}</b> <Pill tone={TIER_TONE[activeEval.card.tier] ?? 'slate'}>{activeEval.card.tier}</Pill>
                      {' · '}Kimya <b>{'◆'.repeat(chem.perSlot[activeIndex])}{'◇'.repeat(3 - chem.perSlot[activeIndex])}</b>
                    </p>
                    {activeEval.roleFit !== undefined && (
                      <p className="flex items-center gap-1.5">
                        {activeEval.badge && <BadgeDot state={activeEval.badge} />} RoleFit <b>%{Math.round(activeEval.roleFit)}</b> · {activeEval.roleName}
                        {activeEval.setupDelta !== undefined && activeEval.setupDelta !== 0 && <span className="text-xs text-slate-500">(ayar {activeEval.setupDelta > 0 ? '+' : ''}{activeEval.setupDelta})</span>}
                      </p>
                    )}
                    {activeEval.reason && <p className="text-xs text-slate-500">{activeEval.reason}</p>}
                    {activeEval.card.chemStyles && (
                      <p className="text-xs">
                        Chem style önerisi: <b>{activeEval.card.bestChemStyle}</b>{' '}
                        {activeEval.card.chemStyles.filter((c) => c.style === activeEval.card.bestChemStyle).map((c) => `(meta ${c.metaRating}, +${c.delta})`)}
                      </p>
                    )}
                  </>
                ) : (
                  <Spinner />
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card><EmptyState>Sahada bir slota tıkla.</EmptyState></Card>
        )}

        <UtTacticCode
          tactic={tactic}
          onLoaded={(r) => {
            setFormationId(r.formation)
            setPicked({})
            setRoleOverride(Object.fromEntries(r.slots.map((s) => [s.slotId, s.roleId])))
            setSetup({ buildUp: (BUILD_UPS as readonly string[]).includes(r.buildUp) ? (r.buildUp as Setup['buildUp']) : 'Balanced', depth: r.depth })
          }}
        />
      </div>

      {picking && active && (
        <PickModal
          position={active.position}
          onClose={() => setPicking(false)}
          onPick={(p) => {
            setPicked((cur) => ({ ...cur, [active.slotId]: p }))
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

function Summary({ evaluation }: { evaluation: { slotId: string; badge?: WeaponState; badgeText?: string; roleName?: string }[] }) {
  const weak = evaluation.filter((e) => e.badge === 'RED')
  const strong = evaluation.filter((e) => e.badge === 'GREEN')
  if (evaluation.length === 0) {
    return null
  }
  return (
    <ul className="mt-2 space-y-0.5 text-sm">
      <li className="text-emerald-700 dark:text-emerald-400">+ Rolüne tam oturan: {strong.length}</li>
      {weak.length > 0 && <li className="text-rose-600 dark:text-rose-400">− Rolüne uymayan: {weak.map((w) => `${w.slotId} (${w.roleName})`).join(', ')}</li>}
    </ul>
  )
}

function UtTacticCode({ tactic, onLoaded }: { tactic: TacticRequest; onLoaded: (r: { formation: string; buildUp: string; depth: number; slots: { slotId: string; roleId: string }[] }) => void }) {
  const [input, setInput] = useState('')
  const resolved = useQuery({ queryKey: ['ut-resolve', JSON.stringify(tactic)], queryFn: () => endpoints.resolveTactic(tactic), retry: false })
  const exportCode = useMutation({
    mutationFn: () =>
      endpoints.exportTacticCode({
        ...tactic,
        slots: (resolved.data?.slots ?? []).map((s) => ({ slotId: s.slotId, tags: [], roleId: s.roleId })),
      }),
  })
  const importCode = useMutation({ mutationFn: () => endpoints.importTacticCode(input.trim()), onSuccess: onLoaded })
  return (
    <Card title="EA taktik kodu">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={exportCode.isPending || !resolved.data} onClick={() => exportCode.mutate()}>Kod üret</Button>
          {exportCode.data && <Input readOnly value={exportCode.data.code} className="font-mono" onFocus={(e) => e.currentTarget.select()} aria-label="EA taktik kodu" />}
        </div>
        {exportCode.data?.warnings.map((w) => <p key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>)}
        <ErrorBox error={exportCode.error} />
        <div className="flex items-center gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EA kodunu yapıştır" className="font-mono" maxLength={16} aria-label="EA kodunu yapıştır" />
          <Button disabled={!input.trim() || importCode.isPending} onClick={() => importCode.mutate()}>Yükle</Button>
        </div>
        <ErrorBox error={importCode.error} />
        <p className="text-xs text-slate-500">Kod mod-bağımsızdır: kariyerdeki taktik kodunun aynısı. Yüklemek formasyonu, rolleri, Build-Up'ı ve hattı değiştirir, kartları temizler.</p>
      </div>
    </Card>
  )
}

function PickModal({ position, onClose, onPick }: { position: string; onClose: () => void; onPick: (p: PlayerSummary) => void }) {
  const [q, setQ] = useState('')
  const players = useQuery({
    queryKey: ['ut-pick', position, q],
    queryFn: () => endpoints.players({ pos: [position], q: q || undefined, sort: 'overall', order: 'desc', size: 20, gender: 0 }),
    staleTime: 60_000,
  })
  return (
    <Modal title={`${position} için kart seç`} onClose={onClose}>
      <Input autoFocus placeholder="İsim ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-80 overflow-y-auto">
        {players.isLoading ? (
          <Spinner />
        ) : (players.data?.items ?? []).length === 0 ? (
          <EmptyState>Sonuç yok.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
            {(players.data?.items ?? []).map((p) => (
              <li key={p.id}>
                <button type="button" className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => onPick(p)}>
                  <span><b>{p.overall}</b> {p.name} <span className="text-xs text-slate-500">{p.club}</span></span>
                  <span className="text-xs text-slate-500">{p.league}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
