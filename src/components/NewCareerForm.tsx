import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { Club } from '../api/types'
import { careerStore } from '../state/careerStore'
import { MoneyInput } from './MoneyInput'
import { Button, ErrorBox, Field, Input, Pill } from './ui'

/** Veri aktarmadan yeni kariyer: kulüp ara, bütçe ve isim ver; kadro kulübün kataloğundaki oyunculardan kurulur. */
export function NewCareerForm({ onCreated }: { onCreated?: () => void }) {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club | undefined>()
  const [budget, setBudget] = useState<number | undefined>(undefined)
  const [name, setName] = useState('')
  const clubs = useQuery({ queryKey: ['clubs', term], queryFn: () => endpoints.clubs(term), enabled: term.trim().length >= 1 && !club })
  const create = useMutation({
    mutationFn: () => endpoints.createCareer({ clubId: club!.id, budgetEur: budget ?? 0, name: name || undefined }),
    onSuccess: async (career) => {
      await Promise.all(['careers', 'squad', 'events'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })))
      careerStore.set(career.id)
      setClub(undefined)
      setTerm('')
      setBudget(undefined)
      setName('')
      onCreated?.()
    },
  })

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_320px_auto] lg:items-end">
        <Field label="Kulüp ara">
          <Input value={club ? club.name : term} onChange={(e) => { setClub(undefined); setTerm(e.target.value) }} placeholder="Kulüp adı…" aria-label="Kulüp ara" />
        </Field>
        <Field label="Kariyer adı (isteğe bağlı)">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Örn. Port Vale 2026" />
        </Field>
        <Field label="Transfer bütçesi (€)">
          <MoneyInput key={name + String(club?.id)} value={budget} onChange={setBudget} />
        </Field>
        <Button disabled={!club || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Oluşturuluyor…' : 'Başlat'}
        </Button>
      </div>
      {!club && (clubs.data ?? []).length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-md border border-line text-sm">
          {clubs.data!.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full justify-between px-3 py-1.5 text-left hover:bg-surface-2" onClick={() => setClub(c)}>
                <span>{c.name} {c.gender === 1 && <Pill tone="sky">Kadın</Pill>}</span>
                <span className="text-muted">{c.league}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted">Oyuncu verisi aktarmak zorunda değilsin: kadro kulübün katalogdaki oyuncularıyla başlar. Gerçek kariyer verini sonra İçe aktar bölümünden yükleyebilirsin.</p>
      <div className="mt-2">
        <ErrorBox error={create.error} />
      </div>
    </div>
  )
}
