import { describe, expect, it } from 'vitest'
import { stylesOf } from './formationStyles'
import { protectLead } from './protectLead'

const names = { fullback_defend: 'Fullback (Defend)', fullback_balanced: 'Fullback (Balanced)', box_to_box_ball_winning: 'Box-to-Box (Ball-Winning)' }

describe('protectLead', () => {
  it('saldırgan bek ve ileri B2B rollerini temkinli karşılıklarına çevirir', () => {
    const result = protectLead(
      [
        { slotId: 'LB', position: 'LB', roleId: 'attacking_wingback_attack', roleName: 'Attacking Wingback (Attack)' },
        { slotId: 'RB', position: 'RB', roleId: 'wingback_balanced', roleName: 'Wingback (Balanced)' },
        { slotId: 'CM', position: 'CM', roleId: 'box_to_box_balanced', roleName: 'Box-to-Box (Balanced)' },
        { slotId: 'ST', position: 'ST', roleId: 'poacher_attack', roleName: 'Poacher (Attack)' },
      ],
      55,
      names,
    )
    expect(result.roles.map((r) => `${r.slotId}:${r.to}`)).toEqual(['LB:fullback_defend', 'RB:fullback_balanced', 'CM:box_to_box_ball_winning'])
    expect(result.depth).toEqual({ from: 55, to: 40 })
  })

  it('hedef rol tanımlı değilse öneri üretmez ve hattı alt sınırda tutar', () => {
    const result = protectLead([{ slotId: 'LB', position: 'LB', roleId: 'attacking_wingback_attack', roleName: 'x' }], 30, {})
    expect(result.roles).toHaveLength(0)
    expect(result.depth).toEqual({ from: 30, to: 25 })
    expect(protectLead([], 25, {}).depth).toBeUndefined()
  })
})

describe('formationStyles', () => {
  it('bilinmeyen formasyon için boş döner, bilinene etiket verir', () => {
    expect(stylesOf('9-9-9')).toEqual([])
    expect(stylesOf('5-4-1')).toContain('defensive')
  })

})
