import { describe, expect, it } from 'vitest'
import type { UtCard } from '../../lib/utCard'
import { MAX_APPLY_IDS, planApply } from './useReplicaApply'

const card = (key: string, rating: number, playerId?: number): UtCard => ({ key, source: 'club', name: key, rating, positions: ['ST'], playerId })

describe('kadromla uygula kaynağı', () => {
  it('kariyer modunda aktif kariyer kullanılır', () => {
    expect(planApply('career', { id: 7 }, [], [])).toEqual({ source: 'CAREER', body: { careerId: 7 }, skipped: 0 })
  })

  it('kariyer yoksa katalog örneği ve nedeni', () => {
    const plan = planApply('career', undefined, [], [])
    expect(plan.source).toBe('SAMPLE')
    expect(plan.body).toEqual({})
    expect(plan.note).toMatch(/Kariyer seçili değil/)
  })

  it('UT modunda yalnız katalogla eşleşen kulüp kartları gider, OVR azalan; eşleşmeyenler sayılır', () => {
    const plan = planApply('ut', undefined, [card('a', 80, 1), card('b', 91, 2), card('c', 70), card('d', 85, 1)], [])
    expect(plan.source).toBe('UT')
    expect(plan.body.playerIds).toEqual([2, 1])
    expect(plan.skipped).toBe(1)
  })

  it('"öner" ile eklenen kart havuzun başına eklenir ve tekrar etmez', () => {
    const plan = planApply('ut', undefined, [card('a', 80, 1)], [9, 1])
    expect(plan.body.playerIds).toEqual([9, 1])
  })

  it('UT kartı yoksa örnek kadro', () => {
    const plan = planApply('ut', undefined, [], [])
    expect(plan.source).toBe('SAMPLE')
    expect(plan.note).toMatch(/Kulüp kartın yok/)
  })

  it('sunucu sınırını aşmaz', () => {
    const many = Array.from({ length: MAX_APPLY_IDS + 50 }, (_, i) => card(`k${i}`, 70, i + 1))
    expect(planApply('ut', undefined, many, []).body.playerIds).toHaveLength(MAX_APPLY_IDS)
  })
})
