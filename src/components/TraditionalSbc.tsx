import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '../api/endpoints'
import { solveTraditional, type SbcCandidate, type SbcConstraints, type SbcSolution } from '../lib/sbcTraditional'
import { squadChemistry } from '../lib/chemistry'
import { parseXiText } from '../lib/objectives'
import type { LookupItem } from '../api/types'
import { Pitch } from './squadBuilder/Pitch'
import type { SlotView } from './squadBuilder/PositionCard'
import { swapSlots } from '../lib/squadBuilder'
import { teamRating } from '../lib/sbcTraditional'
import { Button, Card, ErrorBox, Field, Input, Pill, Select } from './ui'

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
  const [picks, setPicks] = useState<(SbcCandidate | undefined)[]>([])

  const solve = useMutation({
    onSuccess: (r) => setPicks(r.picks),
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
  const shown = result ? slots.map((_, i) => picks[i]) : []
  const chemResult = result ? squadChemistry(slots.map((s, i) => ({ position: s.position, card: shown[i] }))) : undefined
  const filled = shown.filter((p): p is SbcCandidate => Boolean(p))
  const views: SlotView[] = slots.map((s, i) => {
    const p = shown[i]
    return {
      slotId: s.slotId,
      position: s.position,
      x: s.x,
      y: s.y,
      player: p && { id: p.id, name: p.name, overall: p.overall },
      roleLabel: '',
      sub: p ? `kimya ${chemResult!.perSlot[i]}` : undefined,
    }
  })
  function swap(from: string, to: string) {
    const a = slots.findIndex((s) => s.slotId === from)
    const b = slots.findIndex((s) => s.slotId === to)
    const byId = swapSlots(Object.fromEntries(picks.map((p, i) => [String(i), p]).filter(([, p]) => p) as [string, SbcCandidate][]), String(a), String(b))
    setPicks(slots.map((_, i) => byId[String(i)]))
  }

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
          <div className="rounded-2xl border border-line bg-surface p-2.5">
            <Pitch slots={views} onPickPlayer={() => undefined} onPickRole={() => undefined} onSwap={swap} />
            <p className="mt-2 px-1 text-xs text-muted">Oyuncuyu başka bir karta sürükle: yer değiştirirler (kimya yeniden hesaplanır).</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone={result.feasible ? 'emerald' : 'rose'}>{result.feasible ? 'Şartlar sağlandı' : 'Şartlar sağlanamadı'}</Pill>
              <Pill tone="sky">rating {filled.length === slots.length ? teamRating(filled.map((p) => p.overall)) : result.teamRating}</Pill>
              <Pill tone="sky">kimya {chemResult ? chemResult.total : result.chemistry}</Pill>
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
