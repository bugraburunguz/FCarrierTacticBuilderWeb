import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, ErrorCodes } from '../api/client'
import { endpoints } from '../api/endpoints'
import type { Preset } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AdvisorResults } from '../components/AdvisorResults'
import { CareerSelect } from '../components/CareerSelect'
import { FitResults } from '../components/FitResults'
import { PitchView } from '../components/PitchView'
import { SlotSuggestions } from '../components/SlotSuggestions'
import { TagChips } from '../components/TagChips'
import { Button, Card, ErrorBox, Field, Pill, Select, Spinner } from '../components/ui'
import { useActiveCareerId } from '../state/careerStore'
import { managerStore, useManager } from '../state/managerStore'
import { tacticStore, toTacticRequest, useTactic } from '../state/tacticStore'

export function TacticBuilderPage() {
  const tactic = useTactic()
  const { authenticated } = useAuth()
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers, enabled: authenticated })
  const career = careers.data?.find((c) => c.id === careerId)
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: authenticated && careerId !== undefined })
  const analyse = useMutation({
    mutationFn: () => endpoints.fitSquad({ careerId: careerId!, tactic: toTacticRequest(tactic) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const manager = useManager()
  const advise = useMutation({
    mutationFn: () => endpoints.advise({ careerId: careerId!, philosophyPresetId: manager.presetId, philosophyWeight: manager.weight, allowTransfers: manager.allowTransfers }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const advice = advise.data?.result
  const fit = analyse.data?.result
  const outOfCredit = analyse.error instanceof ApiError && analyse.error.code === ErrorCodes.insufficientCredit
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
  const replicaGroups = useMemo(() => {
    const groups = new Map<string, Preset[]>()
    ;(presets.data ?? []).filter((p) => p.kind === 'REPLICA').forEach((p) => groups.set(p.club ?? 'Diğer', [...(groups.get(p.club ?? 'Diğer') ?? []), p]))
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr')).map(([club, items]) => [club, [...items].sort((a, b) => (a.season ?? '').localeCompare(b.season ?? ''))] as [string, Preset[]])
  }, [presets.data])
  const preset = presets.data?.find((p) => p.id === tactic.presetId)
  const slot = formation?.slots.find((s) => s.slotId === selectedSlot)
  const resolvedSlot = resolved.data?.slots.find((s) => s.slotId === selectedSlot)
  const slotTags = useMemo(() => (tags.data ?? []).filter((t) => t.position === slot?.group), [tags.data, slot])
  const slotRoles = (roles.data ?? []).filter((r) => slot && r.positions.includes(slot.position))

  if (formations.data && !formation) {
    queueMicrotask(() => tacticStore.set({ formation: '4-3-3', slots: {} }))
  }

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
                {[3, 4, 5].map((backs) => (
                  <optgroup key={backs} label={`${backs} defans`}>
                    {formations.data?.filter((f) => f.id.startsWith(String(backs))).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label ?? f.id}
                      </option>
                    ))}
                  </optgroup>
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
                {replicaGroups.map(([club, items]) => (
                  <optgroup key={club} label={club}>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.season ? `${p.season} · ` : ''}
                        {p.coach ?? p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          {preset?.signature && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{preset.signature}</p>}
          {preset?.sourceNote && <p className="mt-1 text-xs text-slate-500">{preset.sourceNote}</p>}
        </Card>
        <Card title="Yöneticinin mantığı (benim oyun anlayışım)">
          <div className="space-y-3">
            <Field label="Sevdiğim oyun anlayışı">
              <Select value={manager.presetId ?? ''} onChange={(e) => managerStore.set({ presetId: e.target.value || undefined })}>
                <option value="">Fark etmez — kadroya göre en iyisini bul</option>
                {presets.data?.filter((p) => p.kind === 'STYLE').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            {manager.presetId && (
              <Field label={`Anlayışıma sadakat: %${manager.weight}`}>
                <input type="range" min={0} max={100} step={5} value={manager.weight} onChange={(e) => managerStore.set({ weight: Number(e.target.value) })} className="w-full" />
                <p className="text-xs text-slate-500">
                  Yüksekse kadro başka bir oyuna daha yatkın olsa bile anlayışımı öneririm; düşükse sadece kadroya bakarım.
                </p>
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={manager.allowTransfers} onChange={(e) => managerStore.set({ allowTransfers: e.target.checked })} />
              Transfer yapabilirim (zayıf slotlara oyuncu öner)
            </label>
          </div>
        </Card>
        {formation && <PitchView slots={formation.slots} selected={selectedSlot} onSelect={setSelectedSlot} info={info} />}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { tacticStore.set({ formation: tactic.formation, slots: {} }); setSelectedSlot(undefined) }}>
            Davranışları sıfırla
          </Button>
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
        {slot && <SlotSuggestions roleId={resolvedSlot?.roleId} position={slot.position} tags={tactic.slots[slot.slotId]?.tags ?? []} gender={career?.gender} />}
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card title="Kadro analizi" actions={<Pill tone="amber">Kredi harcar</Pill>}>
          {!authenticated ? (
            <p className="text-sm">
              Kendi kadronla uyumu, zayıf halkaları ve kimin kalıp kimin gitmesi gerektiğini görmek için <Link to="/login" className="text-emerald-700 underline">giriş yap</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <CareerSelect />
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={careerId === undefined || analyse.isPending} onClick={() => { advise.reset(); analyse.mutate() }}>
                    {analyse.isPending ? 'Hesaplanıyor…' : 'Mevcut taktiği analiz et'}
                  </Button>
                  <Button disabled={careerId === undefined || advise.isPending} onClick={() => { analyse.reset(); advise.mutate() }}>
                    {advise.isPending ? 'Kurulumlar deneniyor…' : 'Bana en iyi kurulumu bul (8 kredi)'}
                  </Button>
                </div>
              </div>
              <ErrorBox error={analyse.error ?? advise.error} />
              {outOfCredit && (
                <p className="text-sm">
                  Günlük krediler yarın yenilenir ya da <Link to="/profile" className="text-emerald-700 underline">PREMIUM</Link> ile sınırsız kullanabilirsin.
                </p>
              )}
              <p className="text-xs text-slate-500">Teknik hatada kredi iade edilir. Sonuçlar sahadaki oyuncu isimlerine de yansır.</p>
            </div>
          )}
        </Card>
        {advice && <AdvisorResults advice={advice} squad={squad.data ?? []} budgetEur={career?.budgetEur} />}
        {fit && !advice && (
          <FitResults
            result={fit}
            squad={squad.data ?? []}
            budgetEur={career?.budgetEur}
            chargedText={analyse.data && analyse.data.charged > 0 ? `${analyse.data.charged} kredi harcandı${analyse.data.balance !== undefined ? ` · kalan ${analyse.data.balance}` : ''}.` : undefined}
          />
        )}
      </div>
    </div>
  )
}
