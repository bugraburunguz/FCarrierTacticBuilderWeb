import { describe, expect, it } from 'vitest'
import { formatCareerSquadBadge, formatSquadVersion, pickDefaultSquadVersion, squadVersionKeys } from './squadVersion'

const v = (id: number, latest: boolean) => ({ id, versionNo: id, label: `Sürüm ${id}`, gameBuild: null, exportedAt: null, playerCount: 1, latest })

describe('FCA-27 squadVersion', () => {
  it('tarih tr-TR ve İstanbul saatiyle; tarih yok ya da bozuksa yalnız etiket', () => {
    expect(formatSquadVersion({ label: 'A', exportedAt: '2026-11-21T22:30:00Z' })).toBe('A · 22.11.2026')
    expect(formatSquadVersion({ label: 'A', exportedAt: null })).toBe('A')
    expect(formatSquadVersion({ label: 'A', exportedAt: 'x' })).toBe('A')
  })

  it('etiket tarihi zaten içeriyorsa tarih tekrar eklenmez', () => {
    expect(formatSquadVersion({ label: 'Kadro güncellemesi 22.11.2026 (1.0.142)', exportedAt: '2026-11-22T11:51:11Z' }))
      .toBe('Kadro güncellemesi 22.11.2026 (1.0.142)')
  })

  it('varsayılan latest olan; yoksa ilk; boş listede yok', () => {
    expect(pickDefaultSquadVersion([v(1, false), v(2, true)])).toBe(2)
    expect(pickDefaultSquadVersion([v(3, false), v(1, false)])).toBe(3)
    expect(pickDefaultSquadVersion([])).toBeUndefined()
  })

  it('rozet metni; eski sürümde ibare', () => {
    expect(formatCareerSquadBadge({ id: 1, versionNo: 1, label: 'X', exportedAt: null, latest: true })).toBe('Kadro: X')
    expect(formatCareerSquadBadge({ id: 1, versionNo: 1, label: 'X', exportedAt: null, latest: false })).toBe('Kadro: X (eski sürüm)')
  })

  it('query key kariyer kimliği taşımaz', () => {
    expect(squadVersionKeys.all).toEqual(['squad-versions'])
  })
})
