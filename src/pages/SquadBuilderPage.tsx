import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, ErrorCodes } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { AutoFitPanel } from '../components/AutoFitPanel'
import { CareerSelect } from '../components/CareerSelect'
import { FitResults } from '../components/FitResults'
import { FormationStyleChips } from '../components/FormationStyleChips'
import { ProtectLeadCard } from '../components/ProtectLeadCard'
import { SetupChips } from '../components/SetupChips'
import { TeamSetup } from '../components/TeamSetup'
import { Pitch } from '../components/squadBuilder/Pitch'
import { SlotModal } from '../components/squadBuilder/SlotModal'
import { SquadSummaryCard } from '../components/squadBuilder/SquadSummaryCard'
import { Button, Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { TacticCodeCard } from '../features/squad/TacticCodeCard'
import type { SlotPanel } from '../features/squad/types'
import { useCareerSquadBuilder } from '../features/squad/useCareerSquadBuilder'
import { profileOf } from '../lib/wizard'

const AUTO_FIT = '__auto_fit__'

/** v2 kariyer kadro kurucusu (v3: features/squad/CareerSquadBuilderPage). Ortak mantık useCareerSquadBuilder'da. */
export function SquadBuilderPage() {
  const queryClient = useQueryClient()
  const [autoFit, setAutoFit] = useState(false)
  const { careerId, authenticated, presets, career, hasCareer, squad, binding, ws, setup, preset, views, weakReasons, autoFill, canAutoFill, changeFormation, slotTabs, resetBehaviors, pitchHint, loading } = useCareerSquadBuilder()
  const { state, formation, roles, selection, selectedSlot: dialogSlot } = ws

  const analyse = useMutation({
    mutationFn: () => endpoints.fitSquad({ careerId: careerId!, tactic: ws.tactic }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const analysis = analyse.data?.result
  const outOfCredit = analyse.error instanceof ApiError && analyse.error.code === ErrorCodes.insufficientCredit

  function applyPreset(p: Preset) {
    const profile = profileOf(p)
    const next = ws.formations.data?.find((f) => f.id === p.formation)
    ws.patch((cur) => ({
      formationId: p.formation,
      presetId: p.id,
      roleOverride: {},
      tags: Object.fromEntries(Object.entries(p.slotTags ?? {})),
      setup: { buildUp: profile.buildUp, depth: profile.depth },
      ...(next && p.formation !== cur.formationId ? { assigned: binding.carry(ws.slots, cur.assigned, next.slots) } : {}),
    }))
    ws.clearSelection()
  }

  if (loading) {
    return <Spinner />
  }

  const tacticCode = <TacticCodeCard mode="career" tactic={ws.tactic} resolved={ws.resolved.data} onLoaded={(r) => { setAutoFit(false); ws.applyImportedCode(r) }} />

  return (
    <div className="space-y-4">
      {autoFit && ws.formations.data && presets.data && <AutoFitPanel formations={ws.formations.data} presets={presets.data} setup={setup} />}

      <div className="flex flex-wrap items-center gap-3">
        <CareerSelect />
        <Button variant="secondary" disabled={!canAutoFill} onClick={() => autoFill.mutate()}>
          {autoFill.isPending ? 'Diziliyor…' : "En iyi 11'i diz"}
        </Button>
        <Button variant="ghost" onClick={resetBehaviors}>
          Davranışları sıfırla
        </Button>
      </div>
      <ErrorBox error={ws.resolved.error ?? autoFill.error ?? squad.error} />

      <div className="grid items-start gap-4 min-[820px]:grid-cols-[360px_1fr]">
        <div className="order-2 flex flex-col gap-3.5 min-[820px]:order-1">
          {tacticCode}
          <SquadSummaryCard formations={ws.formations.data ?? []} formationId={formation?.id ?? ''} onFormation={changeFormation} views={views} weakReasons={weakReasons} />
          <section className="rounded-md border border-line bg-surface p-3.5 text-ink">
            <h2 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[1.5px] text-accent">Taktik felsefesi</h2>
            <Field label="Oyun felsefesi">
              <Select
                value={autoFit ? AUTO_FIT : state.presetId ?? ''}
                onChange={(e) => {
                  if (e.target.value === AUTO_FIT) {
                    setAutoFit(true)
                    return
                  }
                  setAutoFit(false)
                  const p = presets.data?.find((x) => x.id === e.target.value)
                  if (p) {
                    applyPreset(p)
                  }
                }}
              >
                <option value="">Seçiniz…</option>
                <optgroup label="Benim / otomatik">
                  {presets.data?.filter((p) => p.kind === 'PERSONAL').map((p) => (
                    <option key={p.id} value={p.id}>Benim oyun anlayışım — {p.name}</option>
                  ))}
                  <option value={AUTO_FIT}>Takıma göre en iyi taktik (Auto-Fit)</option>
                </optgroup>
                <optgroup label="Oyun felsefeleri">
                  {presets.data?.filter((p) => p.kind === 'STYLE').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Link to="/replicas" className="mt-2 inline-block text-xs font-semibold text-accent underline underline-offset-2">112 gerçek takım replikası →</Link>
            <FormationStyleChips formationId={formation?.id} />
            {preset?.signature && <p className="mt-2 text-sm text-ink/80">{preset.signature}</p>}
            <SetupChips settings={preset?.settings} />
            {preset?.sourceNote && <p className="mt-1 text-xs text-muted">{preset.sourceNote}</p>}
          </section>
          <TeamSetup careerId={careerId} />
          <ProtectLeadCard slots={ws.resolved.data?.slots ?? []} roles={roles.data ?? []} />
        </div>

        <div className="order-1 space-y-2 min-[820px]:order-2">
          <div className="rounded-md border border-line bg-surface p-2.5">
            <Pitch
              slots={views}
              onPickPlayer={(slotId) => ws.select(slotId, 'card')}
              onPickRole={(slotId) => ws.select(slotId, 'role')}
              onRemove={(slotId) => ws.assign(slotId, null)}
              onSwap={hasCareer ? ws.swap : undefined}
            />
            <p className="mt-2 px-1 text-xs text-muted">{pitchHint}</p>
          </div>
        </div>
      </div>

      <Card title="Kadro analizi" actions={<Pill tone="amber">Kredi harcar</Pill>}>
        {!authenticated ? (
          <p className="text-sm">
            Kendi kadronla uyumu, zayıf halkaları ve kimin kalıp kimin gitmesi gerektiğini görmek için <Link to="/login" className="text-accent underline">giriş yap</Link>.
          </p>
        ) : (
          <div className="space-y-2">
            <Button disabled={careerId === undefined || analyse.isPending} onClick={() => analyse.mutate()}>
              {analyse.isPending ? 'Hesaplanıyor…' : 'Mevcut taktiği analiz et'}
            </Button>
            <ErrorBox error={analyse.error} />
            {outOfCredit && (
              <p className="text-sm">
                Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-accent underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
              </p>
            )}
            <p className="text-xs text-muted">Teknik hatada kredi iade edilir.</p>
          </div>
        )}
      </Card>
      {analysis && (
        <FitResults
          result={analysis}
          squad={squad.data ?? []}
          budgetEur={career?.budgetEur}
          chargedText={analyse.data && analyse.data.charged > 0 ? `${analyse.data.charged} kredi harcandı${analyse.data.balance !== undefined ? ` · kalan ${analyse.data.balance}` : ''}.` : undefined}
        />
      )}

      {selection && dialogSlot && (
        <SlotModal
          title={`${dialogSlot.slotId} · ${dialogSlot.position}`}
          hint="Oyuncu, rol, davranışlar ve öneriler"
          active={selection.panel}
          onTab={(tab) => ws.select(dialogSlot.slotId, tab as SlotPanel)}
          onClose={ws.clearSelection}
          tabs={slotTabs}
        />
      )}
    </div>
  )
}
