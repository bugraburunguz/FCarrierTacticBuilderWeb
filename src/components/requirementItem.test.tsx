import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SbcChallenge } from '../api/types'
import { challengeSetup, describeRequirement } from '../lib/sbcChallenge'
import { RequirementItem } from './RequirementItem'

// V3-05c-c: yakalamada görülen yeni tipler ve bilinmeyen şart sessizce düşmez.
describe('şart tipleri (V3-05c-c)', () => {
  it('PLAYER_ATTRIBUTE ve ACADEMY_SLOTTING anlamı doğrulanmadı diye yazılır', () => {
    expect(describeRequirement({ kind: 'PLAYER_ATTRIBUTE', op: 'MIN', value: 80 })).toBe('Özellik şartı (doğrulanmadı): en az 80')
    expect(describeRequirement({ kind: 'ACADEMY_SLOTTING', op: 'EXACT', value: 1 })).toBe('Evolution oyuncusu şartı (doğrulanmadı): tam 1')
  })

  it('bilinmeyen şart EA tip adı ve ham değeriyle', () => {
    expect(describeRequirement({ kind: 'UNKNOWN', op: 'MIN', value: 5, eaType: 'SOMETHING_NEW' })).toBe('SOMETHING_NEW en az 5')
  })

  it('arayüz: bilinmeyen şartta "Bilinmeyen şart" çipi, bilinen şartta yok', () => {
    const { unmount } = render(<ul><RequirementItem requirement={{ kind: 'UNKNOWN', op: 'MIN', value: 5, eaType: 'SOMETHING_NEW' }} /></ul>)
    expect(screen.getByText('Bilinmeyen şart')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('SOMETHING_NEW en az 5')
    unmount()
    render(<ul><RequirementItem requirement={{ kind: 'TEAM_RATING', op: 'MIN', value: 75 }} /></ul>)
    expect(screen.queryByText('Bilinmeyen şart')).toBeNull()
  })

  it('çözücü yeni ve bilinmeyen tipleri zorlamaz, notlarda gösterir', () => {
    const challenge = { id: 1, name: 'c', requirements: [{ kind: 'PLAYER_ATTRIBUTE', op: 'MIN', value: 80 }, { kind: 'ACADEMY_SLOTTING', op: 'EXACT', value: 1 }, { kind: 'UNKNOWN', op: 'MIN', value: 5, eaType: 'X' }] } as unknown as SbcChallenge
    expect(challengeSetup(challenge, []).notes).toHaveLength(3)
  })
})
