import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { CareerPlayer, Club } from '../api/types'
import { Button, ErrorBox, Field, Input, Modal } from './ui'

interface Props {
  mode: 'SELL' | 'LOAN_OUT'
  entry: CareerPlayer
  gender?: number
  pending: boolean
  error: unknown
  onSubmit: (value: { feeEur: number; toClubId?: number }) => void
  onClose: () => void
}

export function TransferDialog({ mode, entry, gender, pending, error, onSubmit, onClose }: Props) {
  const [fee, setFee] = useState('')
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club | undefined>()
  const clubs = useQuery({
    queryKey: ['clubs', term, gender],
    queryFn: () => endpoints.clubs(term, { gender, limit: 6 }),
    enabled: term.trim().length >= 2 && !club,
  })
  const selling = mode === 'SELL'

  return (
    <Modal title={`${entry.player.name} — ${selling ? 'Satış' : 'Kiralık verme'}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label={selling ? 'Gelen bedel (€)' : 'Kiralama bedeli (€, yoksa 0)'}>
          <Input type="number" min={0} autoFocus value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0" />
        </Field>
        <Field label={selling ? 'Hangi kulübe satıldı? (isteğe bağlı)' : 'Hangi kulübe kiralandı? (isteğe bağlı)'}>
          <Input
            value={club ? club.name : term}
            onChange={(e) => {
              setClub(undefined)
              setTerm(e.target.value)
            }}
            placeholder="Kulüp ara…"
          />
        </Field>
        {!club && (clubs.data ?? []).length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-600">
            {clubs.data!.map((c) => (
              <li key={c.id}>
                <button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setClub(c)}>
                  <span>{c.name}</span>
                  <span className="text-slate-500">{c.league}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">Oyundaki gerçek bedeli ve alıcı kulübü gir; uygulama hareketi geçmişe kaydeder ve bütçeni günceller.</p>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant={selling ? 'danger' : 'primary'} disabled={pending} onClick={() => onSubmit({ feeEur: fee ? Number(fee) : 0, toClubId: club?.id })}>
            {selling ? 'Satışı onayla' : 'Kiralığı onayla'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
