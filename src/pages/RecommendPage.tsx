import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/endpoints'
import { CareerSelect } from '../components/CareerSelect'
import { TransferTargets } from '../components/TransferTargets'
import { BadgeDot, Button, Card, EmptyState, ErrorBox, Field, Input, Select } from '../components/ui'
import { canPlaySlot, POSITION_LABELS } from '../lib/positions'
import { scoutLink } from '../lib/scout'
import { useActiveCareerId } from '../state/careerStore'
import { toTacticRequest, useTactic } from '../state/tacticStore'

export function RecommendPage() {
  const tactic = useTactic()
  const careerId = useActiveCareerId()
  const queryClient = useQueryClient()
  const [slotId, setSlotId] = useState('')
  const [budget, setBudget] = useState('')
  const [currentId, setCurrentId] = useState('')

  const resolved = useQuery({ queryKey: ['resolve', JSON.stringify(toTacticRequest(tactic))], queryFn: () => endpoints.resolveTactic(toTacticRequest(tactic)), retry: false })
  const squad = useQuery({ queryKey: ['squad', careerId], queryFn: () => endpoints.squad(careerId!), enabled: careerId !== undefined })
  const slot = resolved.data?.slots.find((s) => s.slotId === slotId)
  // Karşılaştırma oyuncusu yalnızca bu slotta oynayabilen oyunculardan seçilir (kaleci slotunda sadece kaleciler).
  const eligible = slot
    ? (squad.data ?? []).filter((s) => canPlaySlot(s.player.positions, slot.position)).sort((a, b) => b.player.overall - a.player.overall)
    : []

  const run = useMutation({
    mutationFn: () =>
      endpoints.recommendSlot({
        careerId,
        roleId: slot!.roleId,
        position: slot!.position,
        tags: slot!.tags,
        budgetMax: budget ? Number(budget) : undefined,
        setup: tactic.setup,
        currentPlayerId: currentId ? Number(currentId) : undefined,
        limit: 10,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })
  const result = run.data?.result

  return (
    <div className="space-y-4">
      <CareerSelect />
      <TransferTargets careerId={careerId} slots={resolved.data?.slots ?? []} setup={tactic.setup} />
      <Card title="Slot önerisi (detaylı, 3 kredi)">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Slot">
            <Select value={slotId} onChange={(e) => { setSlotId(e.target.value); setCurrentId('') }}>
              <option value="">Seçiniz…</option>
              {resolved.data?.slots.map((s) => (
                <option key={s.slotId} value={s.slotId}>
                  {s.slotId} — {s.roleName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Transfer bütçesi üst sınırı (€) — boşsa kariyer bütçesi">
            <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label={slot ? `Karşılaştırılacak oyuncu — ${POSITION_LABELS[slot.position] ?? slot.position}` : 'Karşılaştırılacak oyuncu'}>
            <Select value={currentId} onChange={(e) => setCurrentId(e.target.value)} disabled={!slot}>
              <option value="">{!slot ? 'Önce slot seç' : eligible.length === 0 ? 'Bu mevkide oyuncun yok' : 'Yok'}</option>
              {eligible.map((s) => (
                <option key={s.player.id} value={s.player.id}>
                  {s.player.name} ({s.player.overall} · {s.player.positions.slice(0, 3).join('/')})
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button disabled={!slot || careerId === undefined || run.isPending} onClick={() => run.mutate()}>
            {run.isPending ? 'Aranıyor…' : 'Öner'}
          </Button>
          <span className="text-xs text-slate-500">
            Taktik: {tactic.formation} — <Link to="/tactics/builder" className="text-emerald-700 underline">düzenle</Link>. Bu işlem kredi harcar.
          </span>
        </div>
        <div className="mt-2"><ErrorBox error={run.error} /><ErrorBox error={resolved.error} /></div>
      </Card>

      {!result ? (
        <EmptyState>Bir slot seç; rolün silahlarını taşıyan, bütçene uygun oyuncuları sebepleriyle listeleyelim.</EmptyState>
      ) : (
        <Card title={`Öneriler — ${slot?.roleName ?? result.roleId}`} actions={<Link to={scoutLink(result.scoutQuery)} className="text-sm text-emerald-700 underline">Scout filtresi</Link>}>
          {result.current && (
            <p className="mb-3 rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">
              Mevcut: <strong>{result.current.roleFit.playerName}</strong> <BadgeDot state={result.current.roleFit.badge} /> uyum %{Math.round(result.current.combined)}
            </p>
          )}
          {result.items.length === 0 ? (
            <p className="text-sm text-slate-500">Bu bütçe ve rol eşikleriyle uygun oyuncu bulunamadı. Bütçeyi artırmayı dene.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.items.map((item) => (
                <li key={item.roleFit.playerId} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link to={`/players/${item.roleFit.playerId}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                        {item.player?.name ?? item.roleFit.playerName}
                      </Link>{' '}
                      <BadgeDot state={item.roleFit.badge} />
                      <span className="ml-2 text-xs text-slate-500">
                        {item.player ? `${item.player.overall} GEN · POT* ${item.player.potential ?? '—'} · ${item.player.club ?? '—'}` : ''}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <strong>%{Math.round(item.combined)}</strong> uyum · bu rolde ≈{item.roleFit.projectedRating}
                      {item.deltaVsCurrent !== undefined && (
                        <span className={item.deltaVsCurrent >= 0 ? 'ml-2 text-emerald-600' : 'ml-2 text-rose-600'}>
                          {item.deltaVsCurrent >= 0 ? '+' : ''}
                          {item.deltaVsCurrent} vs mevcut
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.roleFit.badgeText}</p>
                </li>
              ))}
            </ul>
          )}
          {run.data && run.data.charged > 0 && <p className="mt-2 text-xs text-slate-500">{run.data.charged} kredi harcandı{run.data.balance !== undefined ? ` · kalan ${run.data.balance}` : ''}.</p>}
        </Card>
      )}
    </div>
  )
}
