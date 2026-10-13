import { describe, expect, it } from 'vitest'
import { squadChemistry, type ChemCard, type ChemCardType } from './chemistry'
import vectors from './utRules.fc27.vectors.json'

interface VectorCard {
  slot: string
  positions: string[]
  clubId?: number
  club?: string
  leagueId?: number
  league?: string
  nationId?: number
  nation?: string
  gender?: number
  type?: string
}

const toCard = (entry: VectorCard, index: number): ChemCard | undefined =>
  entry.clubId === undefined
    ? undefined
    : { id: index, clubId: entry.clubId, leagueId: entry.leagueId, nationId: entry.nationId, gender: entry.gender, positions: entry.positions, cardType: entry.type as ChemCardType | undefined }

describe('kimya — paylaşılan test vektörleri (backend ile aynı dosya)', () => {
  vectors.chemistry.forEach((v) => {
    it(v.name, () => {
      const manager = 'manager' in v && v.manager ? (v.manager as { nationId: number; leagueId: number }) : undefined
      const result = squadChemistry((v.xi as VectorCard[]).map((entry, i) => ({ position: entry.slot, card: toCard(entry, i) })), manager)
      expect(result.perSlot).toEqual(v.expect.perSlot)
      expect(result.total).toBe(v.expect.total)
    })
  })
})
