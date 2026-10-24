import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { endpoints } from '../../api/endpoints'
import type { ReplicaSummary } from '../../api/types'
import { CareerSelect } from '../../components/CareerSelect'
import { Button, EmptyState, Skeleton, TabPanel, Tabs } from '../../design/components/primitives'
import { useActiveCareerId } from '../../state/careerStore'
import { labStore, useLab } from '../../state/labStore'
import { useActiveTactic, type ActiveTactic } from '../career/activeTactic'
import { useTabParam } from '../player/playerPage'
import { ReplicasPage } from '../replicas/ReplicasPage'
import { CodeTab } from './CodeTab'
import { CompareTab } from './CompareTab'
import { DraftBar } from './DraftBar'
import { LabBuilder } from './LabBuilder'
import { cloneReplicaToDraft } from './labSources'
import { WizardTab } from './WizardTab'

/** Ana taktikten (yoksa başlangıç önerisinden) yeni taslak; sınırda labStore mesajı döner. */
function createFrom(careerId: number, active: ActiveTactic | undefined): { id?: string; message?: string } {
  if (!active) {
    return { message: 'Önce kadro yüklenmeli: ana taktik ya da öneri yok.' }
  }
  const fromMain = active.source.kind === 'decision'
  const created = labStore.create(careerId, {
    name: fromMain ? (active.main?.name ?? 'Ana taktik') : 'Otomatik öneri',
    origin: fromMain ? { kind: 'main', ref: String(active.main?.slot) } : { kind: 'auto' },
    tactic: active.tactic,
    lineup: active.lineup,
  })
  return created.ok ? { id: created.draft.id } : { message: created.message }
}

const TABS = [
  { id: 'kurucu', label: 'Kurucu' },
  { id: 'sihirbaz', label: 'Sihirbaz' },
  { id: 'replikalar', label: 'Replikalar' },
  { id: 'kod', label: 'Kod' },
  { id: 'karsilastir', label: 'Karşılaştır' },
] as const
const PREFIX = 'lab'

/**
 * Taktik Laboratuvarı (/career/tactics-lab, KARIYER-UX FAZ 4a-4b, 15 §4.3): katman 3, güvenli deneme alanı. Taslak çubuğu + sekmeler:
 * Kurucu · Sihirbaz · Replikalar · Kod · Karşılaştır (`?sekme=`). Sihirbaz, replika klonu ve EA kodu yeni taslak açıp Kurucu'ya geçer.
 * Taslaklar yalnız tarayıcıda, kariyere göre; "Ana taktiğim yap" tek köprü.
 * `?slot=` (Masa "Rolü değiştir" / "Lab'da dene"): ana taktikten yeni taslak açılır ve slot seçili gelir; parametre adresten düşer.
 */
export function TacticsLabPage() {
  const careerId = useActiveCareerId()
  const client = useQueryClient()
  const { tab, setTab } = useTabParam(TABS)
  const [params, setParams] = useSearchParams()
  const careers = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers })
  const career = careers.data?.find((c) => c.id === careerId) ?? careers.data?.[0]
  const id = career?.id
  const lab = useLab(id)
  const draft = lab.drafts.find((d) => d.id === lab.activeId)
  const { active, isLoading } = useActiveTactic(id)
  const main = active?.main
  const [message, setMessage] = useState<string>()
  const wantedSlot = params.get('slot') ?? undefined
  const [openSlot, setOpenSlot] = useState<string>()
  const consumed = useRef<string | undefined>(undefined)

  // ?slot= : ana taktikten (temiz bir ana taktik taslağı yoksa) yeni taslak açılır; slot, yeni taslağın kurucusu bağlanınca seçilir
  // (openSlot taslak açılışıyla aynı geçişte yazılır, yoksa kurucu eski taslakta slot seçebilir). Parametre adresten düşer.
  useEffect(() => {
    if (!wantedSlot || id === undefined || isLoading || consumed.current === wantedSlot) {
      return
    }
    consumed.current = wantedSlot
    const reusable = draft && draft.origin.kind === 'main' && !draft.dirty
    const result = reusable ? {} : createFrom(id, active)
    // eslint-disable-next-line react/set-state-in-effect -- dış depoya (labStore) yazılan taslakla aynı geçişte; olay yok (adres parametresi).
    setMessage(result.message)
    setOpenSlot(result.message ? undefined : wantedSlot)
    const next = new URLSearchParams(params)
    next.delete('slot')
    setParams(next, { replace: true })
  }, [wantedSlot, id, isLoading, draft, active, params, setParams])

  const onNew = () => (id === undefined ? undefined : createFrom(id, active).message)
  const toBuilder = () => {
    setMessage(undefined)
    setTab('kurucu')
  }
  // Replikalar › "Klonla → taslak": replika taktiği + kadromla diziliş (useReplicaApply ile aynı istek) → yeni taslak → Kurucu.
  const [cloning, setCloning] = useState<string>()
  async function clone(replica: ReplicaSummary) {
    if (id === undefined) {
      return
    }
    setCloning(replica.id)
    try {
      const result = await cloneReplicaToDraft(client, id, replica)
      if (result.ok) {
        toBuilder()
      } else {
        setMessage(result.message)
      }
    } catch {
      setMessage('Replika kadroya uygulanamadı. Tekrar dene.')
    } finally {
      setCloning(undefined)
    }
  }
  const slotOpened = useCallback(() => setOpenSlot(undefined), [])

  if (careers.isLoading) {
    return <Skeleton className="h-64" />
  }
  if (!career || id === undefined) {
    return (
      <div className="mx-auto max-w-[1280px] py-2">
        <h1 className="mb-3 font-display text-[26px] font-bold leading-[30px] sm:text-[32px] sm:leading-9">Taktik Laboratuvarı</h1>
        <EmptyState action={<Link to="/career/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Yeni kariyer başlat</Link>}>
          Taslak denemek için bir kariyer seç ya da yeni kariyer başlat.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 py-2">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] font-bold leading-[30px] tracking-[-0.005em] sm:text-[32px] sm:leading-9">Taktik Laboratuvarı</h1>
        <CareerSelect />
      </header>
      {draft && <DraftBar careerId={id} lab={lab} draft={draft} onNew={onNew} newDisabled={isLoading} />}
      <Tabs label="Lab sekmeleri" idPrefix={PREFIX} value={tab} tabs={[...TABS]} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id="kurucu" active={tab === 'kurucu'}>
        {!draft ? (
          <EmptyState action={<Button variant="primary" disabled={isLoading} onClick={() => setMessage(onNew())}><Plus size={14} aria-hidden="true" />Yeni taslak</Button>}>
            Henüz taslak yok
          </EmptyState>
        ) : (
          <LabBuilder key={draft.id} initialSlot={openSlot} onSlotOpened={slotOpened} />
        )}
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="sihirbaz" active={tab === 'sihirbaz'}>
        <WizardTab careerId={id} onApplied={toBuilder} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="replikalar" active={tab === 'replikalar'}>
        <ReplicasPage embedded cardAction={(replica) => (
          <Button disabled={cloning !== undefined} onClick={() => void clone(replica)}>
            <Copy size={14} aria-hidden="true" />{cloning === replica.id ? 'Açılıyor…' : 'Klonla → taslak'}
          </Button>
        )} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="kod" active={tab === 'kod'}>
        <CodeTab careerId={id} draft={draft} main={main} onCreated={toBuilder} />
      </TabPanel>
      <TabPanel idPrefix={PREFIX} id="karsilastir" active={tab === 'karsilastir'}>
        <CompareTab careerId={id} lab={lab} main={main} />
      </TabPanel>
      {message && <p role="alert" className="text-sm text-bad">{message}</p>}
    </div>
  )
}
