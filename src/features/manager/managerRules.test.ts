import { describe, expect, it } from 'vitest'
import { BACKGROUNDS, LICENCES, band, draftOf, emptyDraft, outlook, reputation, styleFromReplica, togglePriority, toProfile, validate } from './managerRules'

describe('menajer kuralları (MGR-b)', () => {
  it('itibar = geçmiş tabanı + diploma katkısı, en çok 100 (backend ManagerRules ile aynı tablo)', () => {
    expect(reputation('AMATEUR', 'NONE')).toBe(5)
    expect(reputation('PRO_REGIONAL', 'NATIONAL_A')).toBe(46)
    expect(reputation('WORLD_CLASS', 'PRO')).toBe(100)
    expect(reputation('PRO_NATIONAL', 'INTERNATIONAL_B')).toBe(65)
    expect(reputation(undefined, 'PRO')).toBeUndefined()
  })

  it('bant adları backend ile aynı eşiklerde', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 84, 85, 100].map(band)).toEqual([
      'Tanınmıyor', 'Tanınmıyor', 'Yerel tanınırlık', 'Yerel tanınırlık', 'Ulusal tanınırlık', 'Ulusal tanınırlık',
      'Uluslararası tanınırlık', 'Uluslararası tanınırlık', 'Dünya çapında', 'Dünya çapında',
    ])
  })

  it('beklenti satırı itibar bandına göre', () => {
    expect(outlook(30)).toBe('Küçük kulüpler kapı açar; büyük kulüpler temkinli.')
    expect(outlook(90)).toBe('En itibarlı kulüpler ister; beklenti en üst seviyede.')
  })

  it('seçenekler: 8 diploma, 7 geçmiş; her birinde tek satır açıklama', () => {
    expect(LICENCES).toHaveLength(8)
    expect(BACKGROUNDS).toHaveLength(7)
    expect(LICENCES.find((l) => l.id === 'PRO')?.hint).toBe('Futbol bilgisi en yüksek derecede kabul edilir, dünyanın her yerinde çalışabilir.')
    expect([...LICENCES, ...BACKGROUNDS].every((o) => o.hint.length > 0 && !o.hint.includes('\n'))).toBe(true)
  })

  it('öncelik en çok 2: üçüncü eklenmez, seçili olan çıkarılır', () => {
    expect(togglePriority([], 'YOUTH')).toEqual(['YOUTH'])
    expect(togglePriority(['YOUTH', 'RESCUE'], 'FINANCIAL')).toEqual(['YOUTH', 'RESCUE'])
    expect(togglePriority(['YOUTH', 'RESCUE'], 'YOUTH')).toEqual(['RESCUE'])
  })

  it('replika kısayolu: build-up ve savunma yaklaşımı tarza eşlenir', () => {
    expect(styleFromReplica('SHORT_PASSING', 'HIGH')).toBe('POSSESSION')
    expect(styleFromReplica('COUNTER', 'DEEP')).toBe('COUNTER')
    expect(styleFromReplica('BALANCED', 'AGGRESSIVE')).toBe('HIGH_PRESS')
    expect(styleFromReplica('BALANCED', 'BALANCED')).toBe('BALANCED')
  })

  it('kayıtlı profildeki null alanlar (sunucu boşları null döner) taslağa ve gövdeye taşınmaz', () => {
    const saved = { name: null, licence: 'PRO', background: 'WORLD_CLASS', formation: null, style: 'POSSESSION', priorities: [], difficulty: 'EASY', leagueId: null, gender: null }
    const draft = draftOf(saved as never)
    expect(draft).toEqual({ name: '', licence: 'PRO', background: 'WORLD_CLASS', style: 'POSSESSION', priorities: [], difficulty: 'EASY' })
    expect(toProfile(draft)).toEqual({ licence: 'PRO', background: 'WORLD_CLASS', style: 'POSSESSION', priorities: [], difficulty: 'EASY' })
  })

  it('doğrulama: geçmiş ve diploma zorunlu; profil gövdesi boş alanları göndermez', () => {
    expect(validate(emptyDraft())).toEqual(['Futbolculuk geçmişini seç.', 'Antrenörlük diplomasını seç.'])
    const draft = { ...emptyDraft(), background: 'PRO_LOCAL' as const, licence: 'NONE' as const, name: '  ' }
    expect(validate(draft)).toEqual([])
    expect(toProfile(draft)).toEqual({ licence: 'NONE', background: 'PRO_LOCAL', style: 'BALANCED', priorities: [], difficulty: 'MEDIUM' })
    expect(toProfile({ ...draft, name: ' Buğra ', formation: '4-3-3', leagueId: 13, gender: 0 })).toMatchObject({ name: 'Buğra', formation: '4-3-3', leagueId: 13, gender: 0 })
  })
})
