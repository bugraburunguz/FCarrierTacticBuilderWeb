import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { CareerPlayer, Formation, StarterTactic, UserTactic } from '../../api/types'
import { Pitch, type PitchSlot } from '../../components/pitch/Pitch'
import { Panel } from '../../design/components/primitives'
import { StarterTacticPanel } from '../career/StarterTacticPanel'

/*
 * YALNIZ GELİŞTİRME (App.tsx'te import.meta.env.DEV): KARIYER-UX FAZ 1 bileşen önizlemesi (ekran görüntüsü, axe, kontrast).
 * Prod derlemesine girmez. Veri: kurgusal sabit örnekler; önizlemenin kendi sorgu önbelleğine tohumlanır, ağ isteği yalnız /formations.
 * ?bolum=oneri | saha | panel
 */
const AUTO_CAREER = 900_001
const MAIN_CAREER = 900_002

const NAMES = ['Ari Kestane', 'Deniz Varol', 'Emre Tokat', 'Kaan Uslu', 'Mert Çınar', 'Ozan Ilgaz', 'Sarp Gökçe', 'Tuna Erdem', 'Uğur Ay', 'Yiğit Bora', 'Zafer Lale']
const OVERALLS = [66, 62, 64, 63, 61, 65, 68, 63, 67, 69, 64]

/** "winger_balanced" → "Winger · Balanced" (sahadaki rol etiketi biçimi). */
function roleLabel(roleId: string): string {
  const parts = roleId.split('_')
  const focus = parts.pop() ?? ''
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase('en') + s.slice(1)
  return `${parts.map(cap).join(' ')} · ${cap(focus)}`
}

function squadFor(formation: Formation): CareerPlayer[] {
  return formation.slots.map((s, i) => ({ player: { id: 9000 + i, name: NAMES[i % NAMES.length], overall: OVERALLS[i % OVERALLS.length], positions: [s.position] }, onLoan: false })) as unknown as CareerPlayer[]
}

function seed(formation: Formation): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  const squad = squadFor(formation)
  const lineup = Object.fromEntries(formation.slots.map((s, i) => [s.slotId, 9000 + i]))
  const starter: StarterTactic = {
    formationId: formation.id, setup: { buildUp: 'Balanced', depth: 50 }, squadFit: 72.4,
    slots: formation.slots.map((s) => ({ slotId: s.slotId, position: s.position, roleId: s.defaultRole, roleName: roleLabel(s.defaultRole) })),
    lineup, alternatives: [{ formationId: '4-2-3-1', score: 71.1 }, { formationId: '4-4-2', score: 70.3 }],
  }
  const main: UserTactic = {
    slot: 2, careerId: MAIN_CAREER, name: 'Kontra 4-3-3', formation: formation.id, buildUp: 'Counter', defensiveApproach: null, lineHeight: null,
    slots: formation.slots.map((s) => ({ slot: s.slotId, position: s.position, roleId: s.defaultRole, tags: [] })), eaCode: null, sourceReplicaId: null,
    main: true, lineup: Object.fromEntries(Object.entries(lineup).slice(2)), depth: 40, presetId: null, updatedAt: '2026-10-22T10:00:00Z', lineupDropped: 2,
  }
  for (const [careerId, mainValue] of [[AUTO_CAREER, null], [MAIN_CAREER, main]] as const) {
    client.setQueryData(['main-tactic', careerId], mainValue)
    client.setQueryData(['starter-tactic', careerId], starter)
    client.setQueryData(['squad', careerId], squad)
    client.setQueryData(['user-tactics', careerId], [])
  }
  client.setQueryData(['formations'], [formation])
  return client
}

/**
 * Örnek uyum: durum yüzdeyle tutarlı (FAZ 1 düzeltme 3). Gerçek veride renk sunucunun rol etiketinden gelir ve yüzdeden ayrışabilir;
 * piyonun title / erişilebilir adı bunu yazar. Önizlemede yanıltıcı karışım olmasın diye tek kural kullanılır.
 */
function fitOf(pct: number): { pct: number; state: 'good' | 'neutral' | 'ok' | 'bad' } {
  return { pct, state: pct >= 75 ? 'good' : pct >= 65 ? 'neutral' : pct >= 55 ? 'ok' : 'bad' }
}

function pitchSlots(formation: Formation): PitchSlot[] {
  return formation.slots.map((s, i) => ({
    slotId: s.slotId, position: s.position, x: s.x, y: s.y,
    player: i === 4 ? undefined : { name: NAMES[i % NAMES.length], rating: OVERALLS[i % OVERALLS.length], position: s.position },
    fit: i === 4 ? undefined : fitOf(48 + ((i * 7) % 38)),
    roleLabel: roleLabel(s.defaultRole),
  }))
}

function Seeded({ formation, section }: { formation: Formation; section: string }) {
  const [client] = useState(() => seed(formation))
  return (
    <QueryClientProvider client={client}>
      {section === 'oneri' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StarterTacticPanel careerId={AUTO_CAREER} onDetailed={() => undefined} detailedCost={8} />
          <StarterTacticPanel careerId={MAIN_CAREER} />
        </div>
      )}
      {section === 'saha' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Cyber-Pitch · piyon" source={{ kind: 'decision', label: 'Ana taktik' }}>
            <Pitch slots={pitchSlots(formation)} onPickPlayer={() => undefined} readOnly field="cyber" marker="pawn" />
          </Panel>
          <Panel title="Cyber-Pitch · kart" edge="draft" source={{ kind: 'draft' }}>
            <Pitch slots={pitchSlots(formation)} onPickPlayer={() => undefined} field="cyber" />
          </Panel>
          <Panel title="Çim · kart (UT)">
            <Pitch slots={pitchSlots(formation)} onPickPlayer={() => undefined} />
          </Panel>
        </div>
      )}
      {section === 'panel' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Kayıt verisi" source={{ kind: 'record', at: '2026-10-18' }}><p className="text-sm text-ink-2">Salt okunur içe aktarma.</p></Panel>
          <Panel title="Kariyer kararı" edge="glow" source={{ kind: 'decision' }}><p className="text-sm text-ink-2">Sunucuda kalıcı.</p></Panel>
          <Panel title="Lab taslağı" edge="draft" source={{ kind: 'draft' }}><p className="text-sm text-ink-2">Yerel, geçici.</p></Panel>
          <Panel title="Kaydedilmiş taslak" edge="draft" source={{ kind: 'draft', savedSlot: 2 }}><p className="text-sm text-ink-2">Slot 2'ye yazıldı.</p></Panel>
          <Panel title="Otomatik öneri" source={{ kind: 'auto' }}><p className="text-sm text-ink-2">Ana taktik değil.</p></Panel>
        </div>
      )}
    </QueryClientProvider>
  )
}

export function KariyerUxPreview() {
  const [params] = useSearchParams()
  const section = params.get('bolum') ?? 'oneri'
  const formations = useQuery({ queryKey: ['formations'], queryFn: () => endpoints.formations() })
  const formation = formations.data?.find((f) => f.id === (params.get('formasyon') ?? '4-3-3'))
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
      <h1 className="font-display text-3xl font-bold">KARIYER-UX önizleme</h1>
      {formation ? <Seeded formation={formation} section={section} /> : <p className="text-ink-2">Formasyonlar yükleniyor…</p>}
    </main>
  )
}
