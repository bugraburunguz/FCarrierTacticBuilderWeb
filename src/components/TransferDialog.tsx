import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { CareerPlayer, Club } from '../api/types'
import { AppDialog } from '../design/components/AppDialog'
import { MoneyInput } from './MoneyInput'
import { Button, ErrorBox, Field, Input } from './ui'

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
  // REVIEW O2: bedel diğer ekranlarla aynı para girişiyle (birim seçili, "2,5" → milyon); ham € alanı "15" yazana 15 € gönderiyordu.
  const [fee, setFee] = useState<number | undefined>()
  const [feeValid, setFeeValid] = useState(true)
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club | undefined>()
  const clubs = useQuery({
    queryKey: ['clubs', term, gender],
    queryFn: () => endpoints.clubs(term, { gender, limit: 6 }),
    enabled: term.trim().length >= 2 && !club,
  })
  const selling = mode === 'SELL'

  return (
    <AppDialog title={`${entry.player.name} — ${selling ? 'Satış' : 'Kiralık verme'}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1 text-sm font-medium">
          {selling ? 'Gelen bedel' : 'Kiralama bedeli (yoksa boş)'}
          <MoneyInput ariaLabel={selling ? 'Gelen bedel' : 'Kiralama bedeli'} value={fee} onChange={(euro, meta) => { setFee(euro); setFeeValid(meta?.valid ?? true) }} />
        </div>
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
          <ul className="divide-y divide-line rounded-md border border-line text-sm">
            {clubs.data!.map((c) => (
              <li key={c.id}>
                <button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-surface-2" onClick={() => setClub(c)}>
                  <span>{c.name}</span>
                  <span className="text-muted">{c.league}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Oyundaki gerçek bedeli ve alıcı kulübü gir; uygulama hareketi geçmişe kaydeder ve bütçeni günceller.</p>
        <ErrorBox error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant={selling ? 'danger' : 'primary'} disabled={pending || !feeValid} onClick={() => onSubmit({ feeEur: fee ?? 0, toClubId: club?.id })}>
            {selling ? 'Satışı onayla' : 'Kiralığı onayla'}
          </Button>
        </div>
      </div>
    </AppDialog>
  )
}
