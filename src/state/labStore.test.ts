import { beforeEach, describe, expect, it } from 'vitest'
import type { TacticState } from '../lib/tactic'
import { LAB_DRAFT_LIMIT, LAB_KEY, labStore } from './labStore'

const base: TacticState = { formation: '4-3-3', setup: { buildUp: 'Balanced', depth: 50 }, slots: { ST: { tags: ['st_runner'], roleId: 'advanced_forward_attack' } } }

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('Lab taslak deposu (katman 3, KARIYER-UX FAZ 1)', () => {
  beforeEach(() => {
    localStorage.clear()
    labStore.reload()
  })

  it('taslak kaynaktan kopyalanır: kaynak (sorgu önbelleği) dondurulmuş olsa da değişmez, referans paylaşılmaz', () => {
    const cached = deepFreeze({ tactic: structuredClone(base), lineup: { ST: 9 } })
    const created = labStore.create(1, { name: 'Ana taktikten', origin: { kind: 'main' }, ...cached })
    expect(created.ok).toBe(true)
    const draft = created.ok ? created.draft : undefined
    expect(draft!.tactic).toEqual(base)
    expect(draft!.tactic).not.toBe(cached.tactic)
    expect(draft!.tactic.slots.ST).not.toBe(cached.tactic.slots.ST)

    labStore.patch(1, draft!.id, (d) => ({ tactic: { ...d.tactic, slots: { ...d.tactic.slots, ST: { tags: [], roleId: 'poacher_attack' } } }, lineup: { ST: 10 } }))

    expect(cached.tactic).toEqual(base)
    expect(cached.lineup).toEqual({ ST: 9 })
    expect(labStore.get(1).drafts[0].tactic.slots.ST.roleId).toBe('poacher_attack')
    expect(labStore.get(1).drafts[0].dirty).toBe(true)
  })

  it('kariyerler arası sızıntı yok; kariyer silinince taslakları gider', () => {
    labStore.create(1, { name: 'A', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    labStore.create(2, { name: 'B', origin: { kind: 'auto' }, tactic: base, lineup: {} })
    expect(labStore.get(1).drafts.map((d) => d.name)).toEqual(['A'])
    expect(labStore.get(2).drafts.map((d) => d.name)).toEqual(['B'])
    expect(labStore.get(3).drafts).toEqual([])

    labStore.dropCareer(1)
    expect(labStore.get(1).drafts).toEqual([])
    expect(labStore.get(2).drafts).toHaveLength(1)
  })

  it(`sınır (${LAB_DRAFT_LIMIT}) dolunca yeni taslak açılmaz ve hiçbir taslak sessizce silinmez`, () => {
    for (let i = 0; i < LAB_DRAFT_LIMIT; i++) {
      expect(labStore.create(1, { name: `T${i}`, origin: { kind: 'blank' }, tactic: base, lineup: {} }).ok).toBe(true)
    }
    const refused = labStore.create(1, { name: 'fazla', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    expect(refused).toEqual({ ok: false, message: 'Taslak sınırı (10). Birini sil ya da ana taktik yap.' })
    expect(labStore.get(1).drafts.map((d) => d.name)).toEqual(Array.from({ length: LAB_DRAFT_LIMIT }, (_, i) => `T${i}`))
  })

  it('kirli işareti: düzenleme kirletir, ana taktik olarak kaydetme temizler; yeniden yüklemede korunur', () => {
    const created = labStore.create(1, { name: 'A', origin: { kind: 'auto' }, tactic: base, lineup: {} })
    const id = created.ok ? created.draft.id : ''
    expect(labStore.hasUnsaved(1)).toBe(true)
    labStore.markSaved(1, id, 3)
    expect(labStore.hasUnsaved(1)).toBe(false)
    expect(labStore.get(1).drafts[0].savedTo?.slot).toBe(3)

    labStore.patch(1, id, () => ({ name: 'A2' }))
    expect(labStore.hasUnsaved(1)).toBe(true)

    labStore.reload()
    expect(JSON.parse(localStorage.getItem(LAB_KEY)!)['1'].drafts[0].name).toBe('A2')
    expect(labStore.get(1).activeId).toBe(id)
    expect(labStore.hasUnsaved(1)).toBe(true)
  })

  /** Çok sekme (FAZ 1 düzeltme 5): diğer sekmenin yazdığı taslaklar bu sekmenin belleğine alınır; eski bellekle üzerine yazılmaz. */
  it('başka sekme fc.lab.v1 yazınca storage olayıyla yeniden yüklenir ve onun taslağı korunur', () => {
    labStore.create(1, { name: 'bu sekme', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    const other = JSON.parse(localStorage.getItem(LAB_KEY)!)
    other['1'].drafts.push({ ...other['1'].drafts[0], id: 'other-tab', name: 'öbür sekme' })
    localStorage.setItem(LAB_KEY, JSON.stringify(other))

    window.dispatchEvent(new StorageEvent('storage', { key: LAB_KEY, newValue: JSON.stringify(other) }))
    expect(labStore.get(1).drafts.map((d) => d.name)).toEqual(['bu sekme', 'öbür sekme'])

    labStore.create(1, { name: 'sonra', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    expect(JSON.parse(localStorage.getItem(LAB_KEY)!)['1'].drafts.map((d: { name: string }) => d.name)).toEqual(['bu sekme', 'öbür sekme', 'sonra'])
  })

  it('başka anahtardaki storage olayı yeniden yükleme yapmaz', () => {
    labStore.create(1, { name: 'A', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    localStorage.setItem(LAB_KEY, '{}')
    window.dispatchEvent(new StorageEvent('storage', { key: 'fc.theme', newValue: 'dark' }))
    expect(labStore.get(1).drafts).toHaveLength(1)
  })

  it('silme ve etkin taslak', () => {
    const a = labStore.create(1, { name: 'A', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    const b = labStore.create(1, { name: 'B', origin: { kind: 'blank' }, tactic: base, lineup: {} })
    const aId = a.ok ? a.draft.id : ''
    const bId = b.ok ? b.draft.id : ''
    expect(labStore.get(1).activeId).toBe(bId)
    labStore.remove(1, bId)
    expect(labStore.get(1).activeId).toBe(aId)
    labStore.setActive(1, aId)
    labStore.remove(1, aId)
    expect(labStore.get(1)).toEqual({ activeId: null, drafts: [] })
  })
})
