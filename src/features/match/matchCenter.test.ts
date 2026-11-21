import { describe, expect, it } from 'vitest'
import type { FlankMatchup, FormationSlot, LineStrength, MatchOpponent } from '../../api/types'
import { elevenDiff, flankLanes, groupOpponents, lineRows, missingText, pitchSlotsOf } from './matchCenter'

const flank = (side: 'LEFT' | 'RIGHT', verdict: FlankMatchup['verdict'], counter = false): FlankMatchup => ({
  side, verdict, counter,
  ours: { players: [{ playerId: 1, name: 'Bizim Bek', position: side === 'LEFT' ? 'LB' : 'RB', role: 'Fullback (Balanced)', attackLean: 22, pace: 79 }, { playerId: 2, name: 'Bizim Kanat', position: side === 'LEFT' ? 'LM' : 'RM', role: 'Winger (Attack)', attackLean: 61, pace: 77 }], attackLean: 42, defensiveCover: 29 },
  theirs: { players: [{ playerId: 3, name: 'Rakip Bek', position: side === 'LEFT' ? 'RB' : 'LB', role: 'Fullback (Balanced)', attackLean: 35, pace: 79 }, { playerId: 4, name: 'Rakip Kanat', position: side === 'LEFT' ? 'RW' : 'LW', role: 'Winger (Balanced)', attackLean: 78, pace: 86 }], threat: 79, attackLean: 57, keyThreat: { playerId: 4, name: 'Rakip Kanat', threat: 79, pace: 86, goalsAssists: 0 } },
})

describe('FCA-29 kanat eşleşmesi', () => {
  it('iki kanat soldan sağa; karar metni ve tonu; bizim ve rakip oyuncular mevkileriyle', () => {
    const lanes = flankLanes({ left: flank('LEFT', 'EXPOSED'), right: flank('RIGHT', 'OPPORTUNITY') })
    expect(lanes.map((l) => [l.side, l.label, l.verdictText, l.tone])).toEqual([['LEFT', 'Sol kanat', 'Açık', 'bad'], ['RIGHT', 'Sağ kanat', 'Fırsat', 'good']])
    expect(lanes[0].ours).toEqual([{ id: 1, position: 'LB', name: 'Bizim Bek', role: 'Fullback (Balanced)' }, { id: 2, position: 'LM', name: 'Bizim Kanat', role: 'Winger (Attack)' }])
    expect(lanes[0].theirs.map((p) => p.name)).toEqual(['Rakip Bek', 'Rakip Kanat'])
    expect(lanes[0].stats).toEqual([{ label: 'Rakip tehdidi', value: 79 }, { label: 'Bizim savunma desteği', value: 29 }])
  })

  it('dengeli kanat nötr; eksik taraf atlanır; veri yoksa boş', () => {
    expect(flankLanes({ right: flank('RIGHT', 'BALANCED') }).map((l) => [l.side, l.verdictText, l.tone])).toEqual([['RIGHT', 'Dengeli', undefined]])
    expect(flankLanes(undefined)).toEqual([])
    expect(flankLanes(null)).toEqual([])
  })
})

const opp = (teamId: number, name: string, leagueName: string | null, sameLeague = false): MatchOpponent => ({ teamId, name, leagueName, overall: 70, sameLeague, competitionIds: [] })

describe('FCA-23 Maç Merkezi saf kuralları', () => {
  it('rakipler lige göre gruplu; sıra sunucudaki gibi (önce bizim lig); arama Türkçe büyük/küçük harf duyarsız', () => {
    const list = [opp(1, 'Kuzey İzmir', 'League Two', true), opp(2, 'Güney', 'League Two', true), opp(3, 'Uzak FC', 'Premier League'), opp(4, 'Adsız', null)]
    expect(groupOpponents(list, '').map((g) => [g.league, g.items.map((o) => o.teamId)])).toEqual([['League Two', [1, 2]], ['Premier League', [3]], ['Diğer', [4]]])
    expect(groupOpponents(list, 'izmir').map((g) => g.items.map((o) => o.teamId))).toEqual([[1]])
    expect(groupOpponents(list, 'premier').map((g) => g.items.map((o) => o.teamId))).toEqual([[3]])
    expect(groupOpponents(list, 'yok')).toEqual([])
  })

  it('eksik veri kodu için kısa açıklama', () => {
    expect(missingText('USER_TEAM')).toMatch(/takımın/i)
    expect(missingText('SEASON_STATS')).toMatch(/sezon/i)
    expect(missingText('MATCH_RATINGS')).toMatch(/not/i)
    expect(missingText('BILINMEYEN')).toBe('Bu bölüm için veri yok.')
  })

  it('ilk 11 farkı yalnız ana taktik varken; aynı slotta farklı oyuncu "öneride X yerine Y"; aynı oyuncular farksız', () => {
    const names = new Map([[10, 'Ana Kaleci'], [11, 'Ana Stoper'], [21, 'Yeni Stoper']])
    const eleven = [{ slotId: 'GK', playerId: 10, name: 'Ana Kaleci' }, { slotId: 'CB1', playerId: 21, name: 'Yeni Stoper' }]
    expect(elevenDiff({ GK: 10, CB1: 11 }, eleven, names)).toEqual([{ slotId: 'CB1', out: 'Ana Stoper', in: 'Yeni Stoper' }])
    expect(elevenDiff({ GK: 10, CB1: 21 }, eleven, names)).toEqual([])
    expect(elevenDiff(undefined, eleven, names)).toEqual([])
  })

  it('saha slotları formasyonun koordinatlarıyla; oyuncu slot kimliğiyle, yoksa aynı mevkideki sıradakiyle eşlenir; rol adı yok', () => {
    const formation: FormationSlot[] = [
      { slotId: 'GK', position: 'GK', group: 'GK', defaultRole: 'r', x: 50, y: 90 },
      { slotId: 'CB1', position: 'CB', group: 'DEF', defaultRole: 'r', x: 40, y: 75 },
      { slotId: 'CB2', position: 'CB', group: 'DEF', defaultRole: 'r', x: 60, y: 75 },
    ]
    const slots = pitchSlotsOf(formation, [
      { slotId: 'GK', position: 'GK', name: 'Kaleci', overall: 70 },
      { slotId: 'x', position: 'CB', name: 'Stoper A', overall: 68 },
      { slotId: 'y', position: 'CB', name: 'Stoper B', overall: 66 },
    ])
    expect(slots.map((s) => [s.slotId, s.x, s.y, s.player?.name])).toEqual([['GK', 50, 90, 'Kaleci'], ['CB1', 40, 75, 'Stoper A'], ['CB2', 60, 75, 'Stoper B']])
    expect(slots.every((s) => s.roleLabel === undefined)).toBe(true)
  })

  it('hat güçleri: biz ve rakip yan yana; maç günü değeri varsa o, yoksa kadro değeri; fark bizden rakibi çıkarır', () => {
    const ours: LineStrength = { overall: 70, attack: 72, midfield: 69, defence: 68, matchdayOverall: 71, matchdayAttack: null }
    const opponent: LineStrength = { overall: 74, attack: 75, midfield: 73, defence: 70 }
    expect(lineRows({ ours, opponent })).toEqual([
      { key: 'overall', label: 'Genel', ours: 71, opponent: 74, diff: -3 },
      { key: 'attack', label: 'Hücum', ours: 72, opponent: 75, diff: -3 },
      { key: 'midfield', label: 'Orta saha', ours: 69, opponent: 73, diff: -4 },
      { key: 'defence', label: 'Savunma', ours: 68, opponent: 70, diff: -2 },
    ])
  })
})
