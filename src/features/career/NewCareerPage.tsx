import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { Club } from '../../api/types'
import { DeleteCareerButton } from '../../components/DeleteCareerButton'
import { MoneyInput } from '../../components/MoneyInput'
import { Chip, EmptyState, Skeleton } from '../../design/components/primitives'
import { formatEur } from '../../lib/format'
import { careerStore, useActiveCareerId } from '../../state/careerStore'
import { ErrorAlert, PRIMARY_BUTTON } from '../account/AccountParts'

const INPUT = 'glass-3 min-h-10 w-full rounded-[var(--radius-sm)] px-3 text-sm text-ink placeholder:text-muted max-sm:min-h-11'
const LABEL = 'text-xs font-medium text-ink-2'

/**
 * Yeni kariyer (v3, V3-07a): kulüp ara (katalog kulüpleri), isteğe bağlı ad, sezon, oyun tarihi ve bütçe; oluştur → aktif kariyer → Masa.
 * Bütçe boşsa gönderilmez (bilinmiyor; 0 değil, ENG-02). Oyun tarihi oluşturma isteğinde yok: oluşturduktan sonra kariyere yazılır.
 */
export function NewCareerPage() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const activeId = useActiveCareerId()
  const ids = { club: useId(), name: useId(), season: useId(), date: useId(), list: useId() }
  const [term, setTerm] = useState('')
  const [club, setClub] = useState<Club>()
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [budget, setBudget] = useState<number>()
  const clubs = useQuery({ queryKey: ['clubs', term], queryFn: () => endpoints.clubs(term), enabled: term.trim().length >= 2 && !club })
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const create = useMutation({
    mutationFn: async () => {
      const career = await endpoints.createCareer({
        clubId: club!.id,
        ...(budget !== undefined ? { budgetEur: budget } : {}),
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(season ? { season: Number(season) } : {}),
      })
      if (gameDate) {
        await endpoints.updateCareer(career.id, { gameDate })
      }
      return career
    },
    onSuccess: async (career) => {
      careerStore.set(career.id)
      await Promise.all(['careers', 'squad', 'events'].map((k) => client.invalidateQueries({ queryKey: [k] })))
      navigate('/career/desk')
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3 py-2">
      <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Yeni kariyer</h1>
      <section aria-label="Kariyer bilgileri" className="glass flex flex-col gap-4 p-4 sm:p-5">
        <div className="relative flex flex-col gap-1">
          <label htmlFor={ids.club} className={LABEL}>Kulüp</label>
          <input id={ids.club} role="combobox" aria-expanded={!club && (clubs.data ?? []).length > 0} aria-controls={ids.list} aria-autocomplete="list" className={INPUT}
            value={club ? club.name : term} placeholder="Kulüp adı yaz…" onChange={(e) => { setClub(undefined); setTerm(e.target.value) }} />
          {!club && (clubs.data ?? []).length > 0 && (
            <ul id={ids.list} role="listbox" aria-label="Kulüpler" className="glass-3 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-sm)] text-sm">
              {clubs.data!.map((c) => (
                <li key={c.id} role="option" aria-selected={false} tabIndex={0} onClick={() => setClub(c)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setClub(c)}
                  className="flex min-h-10 cursor-pointer items-center justify-between gap-2 px-3 hover:bg-[var(--glass-hover)] focus-visible:bg-[var(--glass-hover)] max-sm:min-h-11">
                  <span>{c.name}{c.gender === 1 ? ' · Kadın' : ''}</span>
                  <span className="text-xs text-ink-2">{c.league}</span>
                </li>
              ))}
            </ul>
          )}
          {club && <p className="text-xs text-ink-2">Seçili: <b className="text-ink">{club.name}</b>{club.league ? ` · ${club.league}` : ''}</p>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.name} className={LABEL}>Kariyer adı (isteğe bağlı)</label>
            <input id={ids.name} className={INPUT} maxLength={60} value={name} placeholder="Örn. Port Vale 2026" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className={LABEL}>Transfer bütçesi</span>
            <MoneyInput ariaLabel="Transfer bütçesi" value={budget} onChange={setBudget} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.season} className={LABEL}>Sezon</label>
            <input id={ids.season} type="number" min={1} inputMode="numeric" className={INPUT} value={season} placeholder="1" onChange={(e) => setSeason(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.date} className={LABEL}>Oyun tarihi</label>
            <input id={ids.date} type="date" className={INPUT} value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
            <p className="text-xs text-muted">Yaşlar, sözleşme süreleri ve transfer dönemi buna göre hesaplanır; içe aktarmada güncellenir.</p>
          </div>
        </div>
        <ErrorAlert error={create.error} />
        <button type="button" disabled={!club || create.isPending} onClick={() => create.mutate()} className={`${PRIMARY_BUTTON} sm:w-auto sm:self-start`}>
          {create.isPending ? 'Oluşturuluyor…' : 'Kariyeri oluştur'}
        </button>
        <p className="text-xs text-ink-2">Kadro kulübün katalogdaki oyuncularıyla başlar. Gerçek kayıt verin varsa sonra <Link to="/career/import" className="font-semibold text-accent underline-offset-2 hover:underline">içe aktar</Link>.</p>
      </section>

      <section aria-label="Kariyerlerin" className="glass-2 flex flex-col gap-2 p-4">
        <h2 className="font-display text-xl font-semibold leading-6">Kariyerlerin ({careers.data?.length ?? 0})</h2>
        {careers.isLoading ? <Skeleton className="h-16" /> : (careers.data ?? []).length === 0 ? <EmptyState>Henüz kariyerin yok.</EmptyState> : (
          <ul className="flex flex-col divide-y divide-[var(--glass-border)]">
            {careers.data!.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{c.name || c.clubName || `Kulüp ${c.clubId}`}</span>{c.id === activeId && <Chip className="ml-2">Aktif</Chip>}
                  <span className="block text-xs text-ink-2">{c.clubName} · sezon {c.season ?? 1} · {c.squadSize} oyuncu{c.budgetEur ? ` · bütçe ${formatEur(c.budgetEur)}` : ''}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => { careerStore.set(c.id); navigate('/career/desk') }} className="glass-3 inline-flex min-h-10 items-center rounded-[var(--radius-sm)] px-3 font-semibold hover:bg-[var(--glass-hover)] max-sm:min-h-11">Aç</button>
                  <DeleteCareerButton career={c} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
