import { describe, expect, it } from 'vitest'
import type { CareerPlayer } from '../api/types'
import { squadGroups } from './squadGroups'

const p = (id: number, positions: string[], overall: number, potential?: number): CareerPlayer =>
  ({ player: { id, name: `P${id}`, positions, overall, potential }, onLoan: false }) as CareerPlayer

const SQUAD = [
  p(1, ['ST'], 70), p(2, ['LW', 'ST'], 68, 75), p(3, ['LW'], 68, 80), p(4, ['GK'], 66), p(5, ['RB', 'CB'], 64),
  p(6, ['CB'], 69), p(7, ['CM'], 71), p(8, ['RM', 'RW'], 65), p(9, ['LW'], 60),
]

/** KARIYER-UX FAZ 3.1: Kadro listesi ve kartlar ana mevkiye göre (ilk listelenen mevki) gruplanır; ?grup=hat eski hat gruplaması. */
describe('squadGroups', () => {
  it('mevki: sıra GK · RB · CB · LB · CDM · CM · CAM · RM · LM · RW · LW · ST; boş grup yok; başlık kısaltma + Türkçe ad', () => {
    const groups = squadGroups(SQUAD, 'mevki')
    expect(groups.map((g) => g.key)).toEqual(['GK', 'RB', 'CB', 'CM', 'RM', 'LW', 'ST'])
    expect(groups.find((g) => g.key === 'LW')?.title).toBe('LW · Sol kanat')
    expect(groups.find((g) => g.key === 'RB')?.title).toBe('RB · Sağ bek')
  })

  it('grup içinde OVR azalan, eşitlikte POT azalan', () => {
    expect(squadGroups(SQUAD, 'mevki').find((g) => g.key === 'LW')?.players.map((c) => c.player.id)).toEqual([3, 2, 9])
  })

  it('hat: Kaleci · Defans · Orta saha · Hücum (eski gruplama), hat içinde mevki sırası sonra OVR', () => {
    const groups = squadGroups(SQUAD, 'hat')
    expect(groups.map((g) => g.title)).toEqual(['Kaleciler', 'Defans', 'Orta saha', 'Hücum'])
    expect(groups[3].players.map((c) => c.player.id)).toEqual([3, 2, 9, 1])
  })

  it('bilinmeyen ana mevki sonda, kendi grubunda', () => {
    expect(squadGroups([...SQUAD, p(10, ['CF'], 60)], 'mevki').at(-1)).toMatchObject({ key: 'CF', title: 'CF' })
  })
})
