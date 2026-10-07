import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import type { WeaponState } from '../api/types'
import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSolution } from '../lib/sbcTraditional'
import { squadChemistry } from '../lib/chemistry'
import { parseXiText } from '../lib/objectives'
import type { LookupItem } from '../api/types'
import { PitchView } from './PitchView'
import { Button, Card, ErrorBox, Field, Input, Pill, Select } from './ui'

const CHEM_BADGE: WeaponState[] = ['RED', 'YELLOW', 'YELLOW', 'GREEN']
const POOL_SPREAD_DOWN = 8
const POOL_SPREAD_UP = 6

function resolveNames(wanted: Record<string, number>, list: LookupItem[]): { id: number; name: string; count: number }[] {
  return Object.entries(wanted).flatMap(([name, count]) => {
    const hit = list.find((l) => l.name.toLowerCase() === name.toLowerCase()) ?? list.find((l) => l.name.toLowerCase().includes(name.toLowerCase()))
    return hit ? [{ id: hit.id, name: hit.name, count }] : []
  })
}

export function TraditionalSbc() {
  const formations = useQuery({ queryKey: ['formations'], queryFn: endpoints.formations, staleTime: 600_000 })
  const [formationId, setFormationId] = useState('4-4-2')
  const [rating, setRating] = useState('80')
  const [chem, setChem] = useState('20')
  const [sameLeague, setSameLeague] = useState('')
  const [sameNation, setSameNation] = useState('')
  const [sameClub, setSameClub] = useState('')
  const [xiText, setXiText] = useState('')
  const formation = formations.data?.find((f) => f.id === formationId) ?? formations.data?.[0]

  const solve = useMutation({
    mutationFn: async (): Promise<SbcSolution> => {
      const slots = formation!.slots.map((s) => ({ slotId: s.slotId, position: s.position }))
      const min = Number(rating)
      const positions = [...new Set(slots.map((s) => s.position))]
      const pages = await Promise.all(
        positions.map((pos) => endpoints.players({ pos: [pos], ovr_min: min - POOL_SPREAD_DOWN, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 100, gender: 0 })),
      )
      const xi = parseXiText(xiText)
      const [leagueList, nationList] = await Promise.all([endpoints.leagues(0), endpoints.nationalities()])
      const leagueRequired = resolveNames(xi.league, leagueList)
      const nationRequired = resolveNames(xi.nationality, nationList)
      const extraPages = await Promise.all([
        ...leagueRequired.flatMap((r) => positions.map((pos) => endpoints.players({ pos: [pos], league: r.id, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 40, gender: 0 }))),
        ...nationRequired.flatMap((r) => positions.map((pos) => endpoints.players({ pos: [pos], nat: r.id, ovr_max: min + POOL_SPREAD_UP, sort: 'overall', order: 'desc', size: 40, gender: 0 }))),
      ])
      const byId = new Map<number, SbcCandidate>()
      pages.concat(extraPages).flatMap((p) => p.items).forEach((p) =>
        byId.set(p.id, { id: p.id, name: p.name, overall: p.overall, club: p.club, league: p.league, nationality: p.nationality, gender: p.gender, positions: p.positions }),
      )
      const required = {
        league: Object.fromEntries(leagueRequired.map((r) => [r.name, r.count])),
        nationality: Object.fromEntries(nationRequired.map((r) => [r.name, r.count])),
        club: xi.club,
      }
      const constraints: SbcConstraints = {
        required,
        teamRatingMin: min,
        chemMin: Number(chem),
        minSameLeague: sameLeague ? Number(sameLeague) : undefined,
        minSameNation: sameNation ? Number(sameNation) : undefined,
        minSameClub: sameClub ? Number(sameClub) : undefined,
      }
      return solveTraditional(slots, [...byId.values()], constraints)
    },
  })
  const result = solve.data
  const slots = formation?.slots ?? []
  const chemResult = result ? squadChemistry(slots.map((s, i) => ({ position: s.position, card: result.picks[i] }))) : undefined
  const info = result
    ? Object.fromEntries(
        slots.map((s, i) => {
          const p = result.picks[i]
          return [s.slotId, { title: p?.name, subtitle: p ? `${p.overall} · kimya ${chemResult!.perSlot[i]}` : undefined, badge: p ? CHEM_BADGE[chemResult!.perSlot[i]] : undefined }]
        }),
      )
    : {}

  return (
    <Card title="SBC çözücü (squad kurma tipi)">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Takım rating'i, kimya ve oyuncu sayısı şartlarını sağlayan 11'i arar. Fiyat verisi olmadığı için "en ucuz" yerine en düşük toplam rating'li çözüm aranır; havuz katalogdaki temel kartlardır (kulüp havuzu henüz yok).
      </p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Formasyon">
          <Select value={formation?.id} onChange={(e) => setFormationId(e.target.value)}>
            {(formations.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.label ?? f.id}</option>
            ))}
          </Select>
        </Field>
        <Field label="Min takım rating"><Input type="number" min={50} max={95} value={rating} onChange={(e) => setRating(e.target.value)} /></Field>
        <Field label="Min kimya"><Input type="number" min={0} max={33} value={chem} onChange={(e) => setChem(e.target.value)} /></Field>
        <Field label="Aynı ligden min"><Input type="number" min={0} max={11} value={sameLeague} onChange={(e) => setSameLeague(e.target.value)} /></Field>
        <Field label="Aynı ülkeden min"><Input type="number" min={0} max={11} value={sameNation} onChange={(e) => setSameNation(e.target.value)} /></Field>
        <Field label="Aynı kulüpten min"><Input type="number" min={0} max={11} value={sameClub} onChange={(e) => setSameClub(e.target.value)} /></Field>
      </div>
      <div className="mt-3">
        <Field label="XI şartları (isteğe bağlı)">
          <Input value={xiText} onChange={(e) => setXiText(e.target.value)} placeholder="lig:Premier League=1; ülke:Brazil=2" className="font-mono" />
        </Field>
      </div>
      <Button className="mt-3" disabled={!formation || solve.isPending} onClick={() => solve.mutate()}>{solve.isPending ? 'Aranıyor…' : 'Çöz'}</Button>
      {solve.error && <ErrorBox error={solve.error} />}
      {result && (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(260px,420px)_1fr]">
          <PitchView slots={slots} info={info} />
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone={result.feasible ? 'emerald' : 'rose'}>{result.feasible ? 'Şartlar sağlandı' : 'Şartlar sağlanamadı'}</Pill>
              <Pill tone="sky">rating {result.teamRating}</Pill>
              <Pill tone="sky">kimya {result.chemistry}</Pill>
            </div>
            {result.violations.map((v) => (
              <p key={v} className="text-rose-600 dark:text-rose-400">{v}</p>
            ))}
            <p className="text-xs text-slate-500">Arama yaklaşıktır (beam search); şart sağlanamadıysa havuz ya da şartlar gevşetilebilir.</p>
          </div>
        </div>
      )}
    </Card>
  )
}
