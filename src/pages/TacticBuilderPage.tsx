import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { PitchView } from '../components/PitchView'
import { TagChips } from '../components/TagChips'
import { Button, Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { tacticStore, toTacticRequest, useTactic } from '../state/tacticStore'

export function TacticBuilderPage() {
  const tactic = useTactic()
  const [selectedSlot, setSelectedSlot] = useState<string | undefined>()
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations })
  const presets = useQuery({ queryKey: ['presets'], queryFn: () => endpoints.presets() })
  const tags = useQuery({ queryKey: ['tags-all'], queryFn: () => endpoints.behaviorTags() })
  const roles = useQuery({ queryKey: ['roles'], queryFn: endpoints.roles })
  const request = toTacticRequest(tactic)
  const resolved = useQuery({
    queryKey: ['resolve', JSON.stringify(request)],
    queryFn: () => endpoints.resolveTactic(request),
    retry: false,
  })

  const formation = formations.data?.find((f) => f.id === tactic.formation)
  const preset = presets.data?.find((p) => p.id === tactic.presetId)
  const slot = formation?.slots.find((s) => s.slotId === selectedSlot)
  const resolvedSlot = resolved.data?.slots.find((s) => s.slotId === selectedSlot)
  const slotTags = useMemo(() => (tags.data ?? []).filter((t) => t.position === slot?.group), [tags.data, slot])
  const slotRoles = (roles.data ?? []).filter((r) => slot && r.positions.includes(slot.position))

  function applyPreset(p: Preset) {
    const slots: Record<string, { tags: string[] }> = {}
    Object.entries(p.slotTags ?? {}).forEach(([slotId, ids]) => (slots[slotId] = { tags: ids }))
    tacticStore.set({ formation: p.formation, presetId: p.id, slots })
    setSelectedSlot(undefined)
  }

  function changeFormation(id: string) {
    tacticStore.set({ formation: id, presetId: preset?.formation === id ? tactic.presetId : undefined, slots: preset?.formation === id ? tactic.slots : {} })
    setSelectedSlot(undefined)
  }

  function updateSlot(slotId: string, change: { tags?: string[]; roleId?: string | undefined }) {
    const current = tactic.slots[slotId] ?? { tags: [] }
    tacticStore.set({ ...tactic, slots: { ...tactic.slots, [slotId]: { ...current, ...change } } })
  }

  if (formations.isLoading || presets.isLoading) {
    return <Spinner />
  }

  const info = Object.fromEntries(
    (resolved.data?.slots ?? []).map((s) => [s.slotId, { title: s.roleName.replace(/\s*\(.*\)/, ''), subtitle: s.tags.length ? `${s.tags.length} davranış` : undefined }]),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,460px)_1fr]">
      <div className="space-y-3">
        <Card title="Başlangıç">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Formasyon">
              <Select value={tactic.formation} onChange={(e) => changeFormation(e.target.value)}>
                {formations.data?.map((f) => (
                  <option key={f.id}>{f.id}</option>
                ))}
              </Select>
            </Field>
            <Field label="Preset / replika">
              <Select value={tactic.presetId ?? ''} onChange={(e) => { const p = presets.data?.find((x) => x.id === e.target.value); if (p) applyPreset(p) }}>
                <option value="">Seçiniz…</option>
                <optgroup label="Oyun felsefeleri">
                  {presets.data?.filter((p) => p.kind === 'STYLE').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Efsane replikaları">
                  {presets.data?.filter((p) => p.kind === 'REPLICA').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
          </div>
          {preset?.signature && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{preset.signature}</p>}
          {preset?.sourceNote && <p className="mt-1 text-xs text-slate-500">{preset.sourceNote}</p>}
        </Card>
        {formation && <PitchView slots={formation.slots} selected={selectedSlot} onSelect={setSelectedSlot} info={info} />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { tacticStore.set({ formation: tactic.formation, slots: {} }); setSelectedSlot(undefined) }}>
            Davranışları sıfırla
          </Button>
          <Link to="/fit" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
            Kadro uyumuna geç →
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <ErrorBox error={resolved.error} />
        {!slot ? (
          <Card title="Slot ayarları">
            <p className="text-sm text-slate-500">Sahadan bir slot seç; oyuncunun ne yapmasını istediğini davranışlarla belirle. Çelişen davranışlar otomatik kilitlenir.</p>
          </Card>
        ) : (
          <Card title={`Slot ${slot.slotId} · ${slot.position}`}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">Türetilen rol:</span>
                <Pill tone="emerald">{resolvedSlot?.roleName ?? '…'}</Pill>
              </div>
              {preset?.roleHints?.[slot.slotId] && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Aranan profil: {preset.roleHints[slot.slotId]}</p>}
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Davranışlar</p>
                <TagChips tags={slotTags} selected={tactic.slots[slot.slotId]?.tags ?? []} onChange={(next) => updateSlot(slot.slotId, { tags: next })} />
              </div>
              <Field label="Rolü elle seç (davranış oylamasını geçersiz kılar)">
                <Select value={tactic.slots[slot.slotId]?.roleId ?? ''} onChange={(e) => updateSlot(slot.slotId, { roleId: e.target.value || undefined })}>
                  <option value="">Otomatik</option>
                  {slotRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {(tactic.slots[slot.slotId]?.tags ?? []).length > 0 && (
                <ul className="space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
                  {(tactic.slots[slot.slotId]?.tags ?? []).map((id) => (
                    <li key={id}>• {slotTags.find((t) => t.id === id)?.nlg}</li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
