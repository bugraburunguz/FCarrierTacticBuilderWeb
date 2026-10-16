import { describe, expect, it } from 'vitest'
import { SBC_CHALLENGES, sbcClubFixture } from '../../../../tests/fixtures/sbcClubFixture'
import { singleItemCandidates } from './singleItem'

const reqs = (name: string) => SBC_CHALLENGES.find((c) => c.name === name)!.requirements

describe('tek kart teslimi (V3-05d-b)', () => {
  it('şartlar kart verisinden değerlendirilemiyorsa liste yok, elle kontrol', () => {
    const r = singleItemCandidates(reqs('Tek kart (elle)'), sbcClubFixture())
    expect(r.evaluable).toBe(false)
    expect(r.cards).toEqual([])
    expect(r.unverified.map((x) => x.kind)).toEqual(['PLAYER_ATTRIBUTE', 'ACADEMY_SLOTTING'])
  })

  it('değerlendirilebilen şartlar: uygun kulüp kartları, önce takas edilemez sonra düşük reyting', () => {
    const r = singleItemCandidates(reqs('Tek kart (uygun)'), sbcClubFixture())
    expect(r.evaluable).toBe(true)
    expect(r.cards.length).toBeGreaterThan(0)
    expect(r.cards.every((c) => c.rating >= 84)).toBe(true)
    const firstTradeable = r.cards.findIndex((c) => !c.untradeable)
    expect(r.cards.slice(firstTradeable).every((c) => !c.untradeable)).toBe(true)
  })
})
