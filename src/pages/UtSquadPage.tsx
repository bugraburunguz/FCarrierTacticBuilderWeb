import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { PlayerSummary, WeaponState } from '../api/types'
import { PitchView } from '../components/PitchView'
import { Button, Card, EmptyState, ErrorBox, Field, Input, Modal, Pill, Select, Spinner } from '../components/ui'
import { MAX_SQUAD_CHEM, squadChemistry } from '../lib/chemistry'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']

export function UtSquadPage() {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const [formationId, setFormationId] = useState('4-2-3-1 (2)')
  const [picked, setPicked] = useState<Record<string, PlayerSummary>>({})
  const [openSlot, setOpenSlot] = useState<string>()

  const formation = formations.data?.find((f) => f.id === formationId) ?? formations.data?.[0]
  const slots = formation?.slots ?? []

  const chem = useMemo(
    () =>
      squadChemistry(
        slots.map((s) => {
          const p = picked[s.slotId]
          return { position: s.position, card: p ? { id: p.id, club: p.club, league: p.league, nationality: p.nationality, positions: p.positions } : undefined }
        }),
      ),
    [slots, picked],
  )

  const info = Object.fromEntries(
    slots.map((s, i) => {
      const p = picked[s.slotId]
      return [s.slotId, { title: p?.name, subtitle: p ? `${p.overall} · kimya ${chem.perSlot[i]}` : undefined, badge: p ? CHEM_BADGE[chem.perSlot[i]] : undefined }]
    }),
  )
  const filled = slots.filter((s) => picked[s.slotId])
  const average = filled.length ? Math.round(filled.reduce((sum, s) => sum + picked[s.slotId].overall, 0) / filled.length) : 0
  const activeSlot = slots.find((s) => s.slotId === openSlot)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card title="UT Kadro Kurucu">
        {formations.isLoading ? (
          <Spinner />
        ) : formations.error ? (
          <ErrorBox error={formations.error} />
        ) : (
          <>
            <div className="mb-3 max-w-xs">
              <Field label="Formasyon">
                <Select value={formation?.id} onChange={(e) => { setFormationId(e.target.value); setPicked({}) }}>
                  {(formations.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mx-auto max-w-md">
              <PitchView slots={slots} selected={openSlot} onSelect={setOpenSlot} info={info} />
            </div>
          </>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="Kimya">
          <p className="text-3xl font-bold tabular-nums">{chem.total}<span className="text-base font-normal text-slate-500"> / {MAX_SQUAD_CHEM}</span></p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Kadro ortalaması: <b>{average || '—'}</b> · {filled.length}/11 slot dolu</p>
          <p className="mt-2 text-xs text-slate-500">
            Kulüp 2/4/7, lig 3/5/8, ülke 2/5/8 eşikleri; kendi mevkisinde olmayan oyuncu 0 kimya alır. Icon, Hero ve Evolution kartlarının özel kuralları henüz yok. Fiyat verisi olmadığı için bütçe hesaplanmaz.
          </p>
          <Button variant="ghost" className="mt-2" onClick={() => setPicked({})}>Kadroyu temizle</Button>
        </Card>
        <Card title="Slotlar">
          <ul className="space-y-1 text-sm">
            {slots.map((s, i) => {
              const p = picked[s.slotId]
              return (
                <li key={s.slotId} className="flex items-center justify-between gap-2">
                  <button type="button" className="text-left hover:underline" onClick={() => setOpenSlot(s.slotId)}>
                    <span className="mr-2 inline-block w-9 text-xs font-semibold text-slate-500">{s.position}</span>{p ? p.name : <span className="text-slate-400">seç…</span>}
                  </button>
                  {p && <Pill tone={chem.perSlot[i] === 3 ? 'emerald' : chem.perSlot[i] === 0 ? 'rose' : 'amber'}>{chem.perSlot[i]}</Pill>}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {activeSlot && (
        <PickModal
          position={activeSlot.position}
          onClose={() => setOpenSlot(undefined)}
          onPick={(p) => {
            setPicked((cur) => ({ ...cur, [activeSlot.slotId]: p }))
            setOpenSlot(undefined)
          }}
        />
      )}
    </div>
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
    <Modal title={`${position} için oyuncu seç`} onClose={onClose}>
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
