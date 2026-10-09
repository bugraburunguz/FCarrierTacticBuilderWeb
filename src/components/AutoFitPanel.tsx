import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, ErrorCodes } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { Formation, Preset, RankedItem, TacticCombo } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useActiveCareerId } from '../state/careerStore'
import { tacticStore } from '../state/tacticStore'
import { CareerSelect } from './CareerSelect'
import { Button, Card, ErrorBox, Field, Pill, Select } from './ui'

type DiversityMode = 'auto' | 'differentFormation' | 'differentPreset'

const MODES: [DiversityMode, string][] = [
  ['auto', 'Otomatik (skor belirlesin)'],
  ['differentFormation', '2 farklı formasyon'],
  ['differentPreset', '2 farklı anlayış'],
]

function Bars({ title, items }: { title: string; items: RankedItem[] }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-muted">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} title={item.note}>
            <div className="flex justify-between text-sm">
              <span>{item.label}</span>
              <strong className="tabular-nums">%{item.pct}</strong>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent-bg transition-all" style={{ width: `${item.pct}%` }} />
            </div>
            {item.note && <p className="mt-0.5 text-xs text-code">{item.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function applyCombo(combo: TacticCombo) {
  const slots: Record<string, { tags: string[]; roleId?: string }> = {}
  combo.tactic.slots.forEach((s) => {
    slots[s.slotId] = { tags: s.tags ?? [], roleId: s.roleId }
  })
  tacticStore.set({ formation: combo.formation, presetId: combo.tactic.presetId, slots })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

interface Props {
  formations: Formation[]
  presets: Preset[]
  setup?: { buildUp?: string; depth?: number }
}

export function AutoFitPanel({ formations, presets, setup }: Props) {
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const [lockFormation, setLockFormation] = useState('')
  const [lockPreset, setLockPreset] = useState('')
  const [mode, setMode] = useState<DiversityMode>('auto')
  const [useMySetup, setUseMySetup] = useState(false)
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: authenticated && careerId !== undefined })
  const run = useMutation({
    mutationFn: (nextMode: DiversityMode) =>
      endpoints.recommendTactic({ careerId: careerId!, lockFormation: lockFormation || undefined, lockPreset: lockPreset || undefined, topN: 2, diversityMode: nextMode, setup: useMySetup ? setup : undefined }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const result = run.data?.result
  const outOfCredit = run.error instanceof ApiError && run.error.code === ErrorCodes.insufficientCredit
  const tooSmall = (squad.data?.length ?? 0) < 11 && careers.data !== undefined

  function start(nextMode: DiversityMode) {
    setMode(nextMode)
    run.mutate(nextMode)
  }

  if (!authenticated) {
    return (
      <Card title="Takıma göre en iyi taktik (Auto-Fit)">
        <p className="text-sm">
          Kadronun ihtiyacına göre en uygun formasyon ve oyun anlayışını bulmak için <Link to="/login" className="text-accent underline">giriş yap</Link> ve bir kariyer seç.
        </p>
      </Card>
    )
  }

  return (
    <Card title="Takıma göre en iyi taktik (Auto-Fit)" actions={<Pill tone="amber">8 kredi · PREMIUM sınırsız</Pill>}>
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Transfer yapmadan, mevcut kadroya en uygun formasyonu ve oyun anlayışını bulur. Kadro bir şekli kaldırmıyorsa (ör. tek forvet varsa 4-4-2) o şeklin uyumu düşer.
        </p>
        <CareerSelect />
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Formasyonu sabitle (isteğe bağlı)">
            <Select value={lockFormation} onChange={(e) => setLockFormation(e.target.value)}>
              <option value="">Serbest — en iyisini bul</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label ?? f.id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Anlayışı sabitle (isteğe bağlı)">
            <Select value={lockPreset} onChange={(e) => setLockPreset(e.target.value)}>
              <option value="">Serbest — en iyisini bul</option>
              {presets.filter((p) => p.kind !== 'REPLICA').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="İki öneri">
            <Select value={mode} onChange={(e) => setMode(e.target.value as DiversityMode)}>
              {MODES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useMySetup} disabled={!setup} onChange={(e) => setUseMySetup(e.target.checked)} />
          Build-Up ve Depth ayarımı tüm adaylarda sabitle
          <span className="text-xs text-muted">(kapalıyken her anlayış kendi ayarıyla değerlendirilir)</span>
        </label>
        <Button disabled={careerId === undefined || run.isPending || tooSmall} onClick={() => start(mode)}>
          {run.isPending ? 'Kombinasyonlar deneniyor…' : 'En iyi taktiği bul'}
        </Button>
        {tooSmall && <p className="text-xs text-code">Analiz için kadroda en az 11 oyuncu olmalı.</p>}
        <ErrorBox error={run.error} />
        {outOfCredit && (
          <p className="text-sm">
            Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-accent underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
          </p>
        )}
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Uyumlu formasyonlar" items={result.formations} />
            <Bars title="Uyumlu oyun anlayışları" items={result.presets} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {result.bestCombos.map((combo, index) => (
              <div key={`${combo.formation}-${combo.presetId}`} className="rounded-md border border-accent bg-accent-soft p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Pill tone={index === 0 ? 'emerald' : 'sky'}>{index === 0 ? 'En iyi' : 'Alternatif'}</Pill>
                    <h4 className="mt-1 font-bold">{combo.formationLabel}{combo.mirrored ? ' · aynalı' : ''}</h4>
                    <p className="text-sm">{combo.presetName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">%{combo.pct}</div>
                    <div className="text-xs text-muted">uygulanabilirlik %{combo.feasibility}</div>
                  </div>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink">
                  {combo.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <Button className="mt-3" onClick={() => applyCombo(combo)}>
                  Uygula
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={run.isPending} onClick={() => start('differentFormation')}>
              2 farklı formasyon göster
            </Button>
            <Button variant="secondary" disabled={run.isPending} onClick={() => start('differentPreset')}>
              2 farklı anlayış göster
            </Button>
            <Button variant="secondary" disabled={run.isPending} onClick={() => start('auto')}>
              Otomatik
            </Button>
          </div>
          <p className="text-xs text-muted">
            {result.evaluated} kombinasyon denendi. Yüzde = ilk 11 uyumu × yedek derinliği × kadronun şekli/anlayışı kaldırabilme çarpanı. “Uygula” seçimi taktik ayarlarına yazar.
          </p>
        </div>
      )}
    </Card>
  )
}
